import {
  secureFlutterIntegrationConfig,
  extractDecryptedDeployKey,
  extractDecryptedGitToken,
  maskMiniAppCredentials,
} from './flutter-credential.helper';
import { isEncryptedCredential } from '../../common/utils/credential-cipher.util';

describe('FlutterCredentialHelper', () => {
  const samplePrivateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
sample-private-key-content-12345
-----END OPENSSH PRIVATE KEY-----`;

  it('encrypts newly provided deployKey and gitAccessToken on create', () => {
    const incoming = {
      packageName: 'my_flutter_app',
      gitUrl: 'git@github.com:org/repo.git',
      deployKey: samplePrivateKey,
      gitAccessToken: 'ghp_secrettoken123',
    };

    const secured = secureFlutterIntegrationConfig(incoming);
    expect(isEncryptedCredential(secured.deployKey)).toBe(true);
    expect(isEncryptedCredential(secured.gitAccessToken)).toBe(true);

    // Can decrypt back to original
    expect(extractDecryptedDeployKey(secured)).toEqual(samplePrivateKey);
    expect(extractDecryptedGitToken(secured)).toEqual('ghp_secrettoken123');
  });

  it('preserves existing encrypted deployKey when update sends masked value', () => {
    const existing = {
      packageName: 'my_flutter_app',
      deployKey: secureFlutterIntegrationConfig({ deployKey: samplePrivateKey })
        .deployKey,
    };

    const updateWithMask = {
      packageName: 'my_flutter_app_renamed',
      deployKey: '********',
    };

    const secured = secureFlutterIntegrationConfig(updateWithMask, existing);
    expect(secured.deployKey).toEqual(existing.deployKey);
    expect(extractDecryptedDeployKey(secured)).toEqual(samplePrivateKey);
  });

  it('preserves existing deployKey when update leaves deployKey empty', () => {
    const existing = {
      packageName: 'my_flutter_app',
      deployKey: secureFlutterIntegrationConfig({ deployKey: samplePrivateKey })
        .deployKey,
    };

    const updateWithoutKey = {
      packageName: 'my_flutter_app_renamed',
    };

    const secured = secureFlutterIntegrationConfig(updateWithoutKey, existing);
    expect(secured.deployKey).toEqual(existing.deployKey);
    expect(extractDecryptedDeployKey(secured)).toEqual(samplePrivateKey);
  });

  it('updates deployKey if a new real private key is provided in update', () => {
    const existing = {
      deployKey: secureFlutterIntegrationConfig({ deployKey: samplePrivateKey })
        .deployKey,
    };

    const newKey = `-----BEGIN OPENSSH PRIVATE KEY-----\nnew-key-67890\n-----END OPENSSH PRIVATE KEY-----`;
    const updateWithNewKey = {
      deployKey: newKey,
    };

    const secured = secureFlutterIntegrationConfig(updateWithNewKey, existing);
    expect(secured.deployKey).not.toEqual(existing.deployKey);
    expect(extractDecryptedDeployKey(secured)).toEqual(newKey);
  });

  it('masks sensitive credentials across miniApp and pendingRevision', () => {
    const app = {
      id: 'app-uuid-1',
      name: 'Test MiniApp',
      integrationConfig: {
        gitUrl: 'git@github.com:org/repo.git',
        deployKey: secureFlutterIntegrationConfig({
          deployKey: samplePrivateKey,
        }).deployKey,
        gitAccessToken: 'enc:v1:fake:token',
      },
      pendingRevision: {
        integrationConfig: {
          deployKey: secureFlutterIntegrationConfig({
            deployKey: samplePrivateKey,
          }).deployKey,
        },
      },
    };

    const masked = maskMiniAppCredentials(app);
    expect(masked.integrationConfig.deployKey).toBe('********');
    expect(masked.integrationConfig.hasDeployKey).toBe(true);
    expect(masked.integrationConfig.gitAccessToken).toBe('********');
    expect(masked.integrationConfig.hasGitAccessToken).toBe(true);

    expect(masked.pendingRevision.integrationConfig.deployKey).toBe('********');
    expect(masked.pendingRevision.integrationConfig.hasDeployKey).toBe(true);
  });
});
