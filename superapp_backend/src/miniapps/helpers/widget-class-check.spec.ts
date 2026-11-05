import AdmZip from 'adm-zip';
import {
  dartFilesFromZip,
  findWidgetCandidates,
  hasWidgetClass,
} from './widget-class-check';
import { ArchiveSanitizerHelper } from '../../storage/helpers/archive-sanitizer.helper';

const files = {
  'lib/fsa_hr_miniapp.dart': "export 'src/home/hr_home_widget.dart';",
  'lib/src/home/hr_home_widget.dart':
    'class HrHomeWidget extends StatelessWidget { const HrHomeWidget({super.key, required this.onOpen}); final VoidCallback onOpen; }\nclass _Tile extends StatelessWidget {}',
  'lib/src/other.dart': 'class Helper {}',
  'example/lib/main.dart': 'class ExampleWidget { final VoidCallback onOpen; }',
};

function buildZip(wrapper = ''): Buffer {
  const zip = new AdmZip();
  zip.addFile(`${wrapper}pubspec.yaml`, Buffer.from('name: fsa_hr_miniapp\nversion: 1.0.0\n'));
  for (const [path, text] of Object.entries(files)) {
    zip.addFile(`${wrapper}${path}`, Buffer.from(text));
  }
  return zip.toBuffer();
}

describe('findWidgetCandidates / hasWidgetClass', () => {
  it('finds public classes in lib/ whose declaration mentions onOpen', () => {
    expect(findWidgetCandidates(files)).toEqual(['HrHomeWidget']);
  });

  it('skips abstract classes and classes without onOpen', () => {
    expect(
      findWidgetCandidates({
        'lib/a.dart':
          'abstract class Base { final VoidCallback onOpen; }\nfinal class Ok { final VoidCallback onOpen; }\nclass No {}',
      }),
    ).toEqual(['Ok']);
  });

  it('returns sorted unique names', () => {
    expect(
      findWidgetCandidates({
        'lib/b.dart': 'class Zed { void onOpen() {} }',
        'lib/a.dart': 'class Alpha { void onOpen() {} }\nclass Zed { void onOpen() {} }',
      }),
    ).toEqual(['Alpha', 'Zed']);
  });

  it('confirms the class and the package main library', () => {
    expect(hasWidgetClass(files, 'fsa_hr_miniapp', 'HrHomeWidget')).toBe(true);
    expect(hasWidgetClass(files, 'fsa_hr_miniapp', 'HrHomeWidgt')).toBe(false);
    const { ['lib/fsa_hr_miniapp.dart']: _main, ...noMain } = files;
    expect(hasWidgetClass(noMain, 'fsa_hr_miniapp', 'HrHomeWidget')).toBe(false);
  });
});

describe('findWidgetCandidates hardening', () => {
  const one = (src: string) => findWidgetCandidates({ 'lib/a.dart': src });

  it('is linear on a huge file of unterminated block comments', () => {
    const big = '/* '.repeat(170_000); // ~510 KB
    const t0 = Date.now();
    expect(one(big)).toEqual([]);
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it('is linear on many nested classes and repeated modifiers', () => {
    const t0 = Date.now();
    one('class A { '.repeat(60_000) + 'onOpen');
    one('final '.repeat(150_000));
    one('class A '.repeat(100_000));
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it('skips files over 1 MB', () => {
    const body = 'class Big { void onOpen() {} }\n' + ' '.repeat(1_000_001);
    expect(one(body)).toEqual([]);
  });

  it('ignores a class hidden in (nested) block comments', () => {
    expect(
      one('/* outer /* inner */ class Hidden { void onOpen() {} } */\nclass Seen { void onOpen() {} }'),
    ).toEqual(['Seen']);
  });

  it('ignores line comments and comment markers inside strings', () => {
    expect(
      one(
        "// class Nope { onOpen }\nconst s = '/* not a comment';\nclass Real { void onOpen() {} }\nconst t = r'*/ //';\nconst u = \"\"\"/*\"\"\";",
      ),
    ).toEqual(['Real']);
  });

  it('uses the brace-balanced class body, not text up to the next class', () => {
    expect(
      one('class Foo {}\nextension E on int { void onOpen() {} }'),
    ).toEqual([]);
    expect(
      one(
        'class W extends StatefulWidget { const W(); }\nclass WState extends State<W> { void f() { widget.onOpen(); } }',
      ),
    ).toEqual(['WState']);
    expect(
      one('class Outer { void m() { if (x) { y(); } } }\nclass B { void onOpen() {} }'),
    ).toEqual(['B']);
  });

  it('skips sealed and abstract, accepts final/base/interface and annotations', () => {
    expect(
      one(
        'sealed class S { void onOpen() {} }\nabstract final class AF { void onOpen() {} }\nbase class Bs { void onOpen() {} }\ninterface class If { void onOpen() {} }\n@immutable class W { final VoidCallback onOpen; }\n@Deprecated("x") final class D { void onOpen() {} }',
      ),
    ).toEqual(['Bs', 'D', 'If', 'W']);
  });
});

describe('hasWidgetClass export reachability', () => {
  const widget = 'class HrHomeWidget { final VoidCallback onOpen; }';

  it('is false when the class is only in an unexported file', () => {
    expect(
      hasWidgetClass(
        {
          'lib/pkg.dart': 'class Other {}',
          'lib/src/x.dart': widget,
        },
        'pkg',
        'HrHomeWidget',
      ),
    ).toBe(false);
  });

  it('is true when declared in the main library itself', () => {
    expect(hasWidgetClass({ 'lib/pkg.dart': widget }, 'pkg', 'HrHomeWidget')).toBe(true);
  });

  it('follows exports transitively through two files', () => {
    expect(
      hasWidgetClass(
        {
          'lib/pkg.dart': "export 'src/a.dart';",
          'lib/src/a.dart': "export 'home/b.dart';",
          'lib/src/home/b.dart': widget,
        },
        'pkg',
        'HrHomeWidget',
      ),
    ).toBe(true);
  });

  it('resolves ../ relative to the exporting file and ignores package:/dart: URIs', () => {
    const files = {
      'lib/pkg.dart': "export 'package:other/other.dart';\nexport 'dart:async';\nexport 'src/a/a.dart';",
      'lib/src/a/a.dart': "export '../b.dart';",
      'lib/src/b.dart': widget,
    };
    expect(hasWidgetClass(files, 'pkg', 'HrHomeWidget')).toBe(true);
  });

  it('honours show and hide combinators', () => {
    const two =
      'class A { void onOpen() {} }\nclass B { void onOpen() {} }';
    const mk = (directive: string) => ({
      'lib/pkg.dart': directive,
      'lib/src/x.dart': two,
    });
    expect(hasWidgetClass(mk("export 'src/x.dart' show A;"), 'pkg', 'A')).toBe(true);
    expect(hasWidgetClass(mk("export 'src/x.dart' show A;"), 'pkg', 'B')).toBe(false);
    expect(hasWidgetClass(mk("export 'src/x.dart' hide A, B;"), 'pkg', 'A')).toBe(false);
    expect(hasWidgetClass(mk("export 'src/x.dart' hide A;"), 'pkg', 'B')).toBe(true);
    expect(hasWidgetClass(mk("export 'src/x.dart' hide A;"), 'pkg', 'A')).toBe(false);
  });

  it('handles a 2000-file export chain quickly', () => {
    const files: Record<string, string> = {
      'lib/pkg.dart': "export 'src/f0.dart';",
    };
    const N = 2000;
    for (let i = 0; i < N; i++) {
      files[`lib/src/f${i}.dart`] =
        i === N - 1 ? widget : `export 'f${i + 1}.dart';`;
    }
    const t0 = Date.now();
    expect(hasWidgetClass(files, 'pkg', 'HrHomeWidget')).toBe(true);
    expect(hasWidgetClass(files, 'pkg', 'Missing')).toBe(false);
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it('terminates on export cycles and ignores commented-out exports', () => {
    const files = {
      'lib/pkg.dart': "export 'src/a.dart';\n// export 'src/c.dart';",
      'lib/src/a.dart': "export 'b.dart';",
      'lib/src/b.dart': "export 'a.dart';\n" + widget,
      'lib/src/c.dart': 'class Cw { void onOpen() {} }',
    };
    expect(hasWidgetClass(files, 'pkg', 'HrHomeWidget')).toBe(true);
    expect(hasWidgetClass(files, 'pkg', 'Cw')).toBe(false);
  });
});

describe('dartFilesFromZip', () => {
  it('strips a single wrapper folder that holds pubspec.yaml and ignores example/', () => {
    const out = dartFilesFromZip(buildZip('fsa_hr_miniapp/'));
    expect(Object.keys(out).sort()).toEqual([
      'lib/fsa_hr_miniapp.dart',
      'lib/src/home/hr_home_widget.dart',
      'lib/src/other.dart',
    ]);
  });

  it('works without a wrapper folder', () => {
    expect(findWidgetCandidates(dartFilesFromZip(buildZip()))).toEqual(['HrHomeWidget']);
  });

  it('returns {} for a non-zip buffer', () => {
    expect(dartFilesFromZip(Buffer.from('not a zip at all'))).toEqual({});
  });
});

describe('ArchiveSanitizerHelper widgetCandidates', () => {
  it('inspect returns the widget candidates of the archive', () => {
    const helper = new ArchiveSanitizerHelper();
    const res = helper.inspectPackageArchive({
      originalname: 'p.zip',
      buffer: buildZip('fsa_hr_miniapp/'),
    } as Express.Multer.File);
    expect(res.widgetCandidates).toEqual(['HrHomeWidget']);
  });

  it('returns an empty list for a non-zip buffer', () => {
    const helper = new ArchiveSanitizerHelper();
    expect(
      helper.sanitizePackageArchive(Buffer.from('plain text')).widgetCandidates,
    ).toEqual([]);
  });

  describe('export reachability', () => {
    const WIDGET =
      'class {N} extends StatelessWidget { const {N}({super.key, required this.onOpen}); final VoidCallback onOpen; }';
    const widget = (n: string) => WIDGET.split('{N}').join(n);

    function archive(
      lib: Record<string, string>,
      pubspec = 'name: fsa_hr_miniapp\nversion: 1.0.0\n',
      wrapper = '',
    ): Buffer {
      const zip = new AdmZip();
      zip.addFile(`${wrapper}pubspec.yaml`, Buffer.from(pubspec));
      for (const [path, text] of Object.entries(lib)) {
        zip.addFile(`${wrapper}${path}`, Buffer.from(text));
      }
      return zip.toBuffer();
    }

    const candidates = (buf: Buffer) =>
      new ArchiveSanitizerHelper().sanitizePackageArchive(buf).widgetCandidates;

    it('lists only classes the package main library exports', () => {
      const buf = archive({
        'lib/fsa_hr_miniapp.dart': "export 'src/exported.dart';",
        'lib/src/exported.dart': widget('ExportedWidget'),
        'lib/src/internal.dart': widget('InternalWidget'),
      });
      expect(candidates(buf)).toEqual(['ExportedWidget']);
    });

    it('does not list a class declared in an unexported lib/src file', () => {
      const buf = archive({
        'lib/fsa_hr_miniapp.dart': 'class Entry {}',
        'lib/src/hidden.dart': widget('HiddenWidget'),
      });
      expect(candidates(buf)).toEqual([]);
    });

    it('honours show/hide on the export and a wrapper folder', () => {
      const buf = archive(
        {
          'lib/fsa_hr_miniapp.dart': "export 'src/a.dart' show ShownWidget;",
          'lib/src/a.dart': `${widget('ShownWidget')}\n${widget('OtherWidget')}`,
        },
        'name: fsa_hr_miniapp\n',
        'fsa_hr_miniapp/',
      );
      expect(candidates(buf)).toEqual(['ShownWidget']);
    });

    it('is empty when the archive has no pubspec name', () => {
      const buf = archive(
        { 'lib/fsa_hr_miniapp.dart': widget('HrHomeWidget') },
        'version: 1.0.0\n',
      );
      expect(candidates(buf)).toEqual([]);
    });

    it('reads the name from the root pubspec, not a nested example one', () => {
      const zip = new AdmZip();
      zip.addFile('example/pubspec.yaml', Buffer.from('name: example_app\n'));
      zip.addFile('pubspec.yaml', Buffer.from('name: fsa_hr_miniapp\n'));
      zip.addFile('lib/fsa_hr_miniapp.dart', Buffer.from(widget('HrHomeWidget')));
      expect(candidates(zip.toBuffer())).toEqual(['HrHomeWidget']);
    });
  });
});
