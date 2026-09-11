import fs from 'fs';

async function registerOrUpdateJob() {
  const jobName = 'superapp-sandbox-build';
  const jenkinsUrl = process.env.JENKINS_URL || 'http://localhost:8085';
  const jenkinsfile = fs.readFileSync('scripts/jenkins/Jenkinsfile.superapp-sandbox-build', 'utf8');
  const auth = Buffer.from('admin:1167e4d41890ae8043e610a64102eca33d').toString('base64');

  const escapedScript = jenkinsfile
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const configXml = `<?xml version="1.1" encoding="UTF-8"?>
<flow-definition plugin="workflow-job@1600.v6f36ed83529d">
  <actions>
    <org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobAction plugin="pipeline-model-definition@2.2293.v6e7193cec599"/>
    <org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobPropertyTrackerAction plugin="pipeline-model-definition@2.2293.v6e7193cec599">
      <jobProperties/>
      <triggers/>
      <parameters/>
    </org.jenkinsci.plugins.pipeline.modeldefinition.actions.DeclarativeJobPropertyTrackerAction>
  </actions>
  <description>Automated CI Pipeline to build and sync Flutter Web Super App Sandbox</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty>
      <abortPrevious>false</abortPrevious>
    </org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@4267.v39e0eb_f7e1b_2">
    <script>${escapedScript}</script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>`;

  // 1. Check if job already exists
  const checkRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
    headers: { Authorization: `Basic ${auth}` }
  });

  if (checkRes.ok) {
    // Update existing job
    const updateRes = await fetch(`${jenkinsUrl}/job/${jobName}/config.xml`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/xml'
      },
      body: configXml
    });
    if (updateRes.ok) {
      console.log(`✅ Successfully updated existing Jenkins job: ${jobName}`);
    } else {
      console.error(`❌ Failed to update job: ${updateRes.status}`, await updateRes.text());
    }
  } else {
    // Create new job
    const createRes = await fetch(`${jenkinsUrl}/createItem?name=${jobName}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/xml'
      },
      body: configXml
    });
    if (createRes.ok) {
      console.log(`✅ Successfully created new Jenkins job: ${jobName}`);
    } else {
      console.error(`❌ Failed to create job: ${createRes.status}`, await createRes.text());
    }
  }
}

registerOrUpdateJob().catch(err => console.error('Error:', err));
