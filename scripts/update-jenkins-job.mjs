import fs from 'fs';

async function updateJob() {
  const jenkinsfile = fs.readFileSync('scripts/jenkins/Jenkinsfile.miniapp-validation', 'utf8');
  const auth = Buffer.from('admin:1167e4d41890ae8043e610a64102eca33d').toString('base64');
  
  // 1. Fetch current config.xml
  const getRes = await fetch('http://localhost:8085/job/miniapp-validation/config.xml', {
    headers: { Authorization: `Basic ${auth}` }
  });
  if (!getRes.ok) throw new Error('Failed to get job config: ' + getRes.statusText);
  let configXml = await getRes.text();
  
  // 2. Escape XML chars for script tag
  const escapedScript = jenkinsfile
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // 3. Replace <script>...</script>
  configXml = configXml.replace(/<script>[\s\S]*?<\/script>/, `<script>${escapedScript}</script>`);
  
  // 4. Post updated config.xml
  const postRes = await fetch('http://localhost:8085/job/miniapp-validation/config.xml', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/xml'
    },
    body: configXml
  });
  
  if (postRes.ok) {
    console.log('✅ Successfully updated miniapp-validation on local Jenkins!');
  } else {
    console.error('❌ Failed to update config.xml:', postRes.status, await postRes.text());
  }
}

updateJob().catch(err => console.error('Error:', err));
