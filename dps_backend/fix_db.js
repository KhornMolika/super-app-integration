const { DataSource } = require('typeorm');
const db = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'dps_user',
  password: 'dps_password',
  database: 'dps_db'
});
db.initialize().then(async () => {
  await db.query(`ALTER TABLE "permission_proposals" DROP CONSTRAINT "FK_5029f43de31cb24e38db3593e84"`);
  await db.query(`ALTER TABLE "permission_proposals" ADD CONSTRAINT "FK_5029f43de31cb24e38db3593e84" FOREIGN KEY ("miniAppId") REFERENCES "mini_apps"("id") ON DELETE CASCADE`);
  console.log('Constraint updated');
  process.exit(0);
}).catch(console.error);
