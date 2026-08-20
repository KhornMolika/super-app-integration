import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from './access-control/entities/role.entity';
import { Permission } from './access-control/entities/permission.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const permissionRepo: any = app.get(getRepositoryToken(Permission));
  const roleRepo: any = app.get(getRepositoryToken(Role));

  const newPerms = ['miniapp:submit', 'miniapp:approve', 'miniapp:reject', 'miniapp:suspend'];
  
  const savedPerms: any[] = [];
  for (const p of newPerms) {
    let perm = await permissionRepo.findOne({ where: { name: p } });
    if (!perm) {
      perm = permissionRepo.create({ name: p });
      await permissionRepo.save(perm);
    }
    savedPerms.push(perm);
  }

  const adminRole = await roleRepo.findOne({ where: { name: 'ADMIN' }, relations: { permissions: true } });
  if (adminRole) {
    const existingPermNames = adminRole.permissions.map((p: any) => p.name);
    const permsToAdd = savedPerms.filter((p: any) => !existingPermNames.includes(p.name));
    
    if (permsToAdd.length > 0) {
      adminRole.permissions.push(...permsToAdd);
      await roleRepo.save(adminRole);
      console.log('Added permissions to ADMIN role');
    }
  }

  const devRole = await roleRepo.findOne({ where: { name: 'DEVELOPER' }, relations: { permissions: true } });
  if (devRole) {
    const submitPerm = savedPerms.find((p: any) => p.name === 'miniapp:submit');
    const updatePerm = await permissionRepo.findOne({ where: { name: 'miniapp:update' }});
    const existingPermNames = devRole.permissions.map((p: any) => p.name);
    
    const permsToAdd: any[] = [];
    if (submitPerm && !existingPermNames.includes(submitPerm.name)) permsToAdd.push(submitPerm);
    if (updatePerm && !existingPermNames.includes(updatePerm.name)) permsToAdd.push(updatePerm);
    
    if (permsToAdd.length > 0) {
      devRole.permissions.push(...permsToAdd);
      await roleRepo.save(devRole);
      console.log('Added permissions to DEVELOPER role');
    }
  }

  await app.close();
}
bootstrap();
