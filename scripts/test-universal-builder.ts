/**
 * AriaCloud Verification Test Suite
 * Tests Universal Multi-Sector AI Site Generation, Conversational Updates,
 * Dynamic Application Runner, and White-Label Compliance.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  generateUniversalSite,
  compileUniversalSiteHtml,
  updateSiteConversational,
  UniversalSiteSchema,
} from '../services/site-builder/src';
import {
  deployCustomApp,
  getAppDeploymentStatus,
  pauseAppService,
  resumeAppService,
} from '../services/app-runner/src';

async function runTests() {
  console.log('===============================================================');
  console.log('  ARIACLOUD VERIFICATION: SITE GENERATOR, UPDATER & APP RUNNER ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST A: UNIVERSAL CLINIC SITE GENERATION
  // --------------------------------------------------------------------------
  console.log('👉 [TEST A] Universal Site Generation: Kabul Diagnostic Clinic');
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const clinicSubdomain = 'kabul-diagnostic';

  const siteGenResult = await generateUniversalSite({
    tenantId,
    subdomainSlug: clinicSubdomain,
    industry: 'clinic',
    prompt: 'Kabul Diagnostic Clinic offering general medicine, ultrasound, pediatric care, and complete laboratory tests located in Shahr-e Naw, Kabul.',
    publishToS3: false, // Local verification
  });

  const schema = siteGenResult.schema;
  const html = siteGenResult.compiledHtml;

  assert(!!siteGenResult.siteId, 'Site ID generated');
  assert(schema.industry === 'clinic', 'Industry category matches "clinic"');
  assert(schema.subdomainSlug === 'kabul-diagnostic', 'Subdomain slug is "kabul-diagnostic"');
  assert(!!schema.clinic && schema.clinic.doctors.length >= 2, 'Doctor profiles generated (at least 2)');
  assert(!!schema.clinic && schema.clinic.diagnosticTests.length >= 2, 'Diagnostic tests table generated');
  assert(html.includes('ariaSite('), 'Alpine.js reactive store ariaSite() initialized in HTML');
  assert(html.includes('doc-noori') || html.includes('نوری') || html.includes('Noori'), 'Doctor Dr. Noori rendered in HTML schema');
  assert(html.includes('whatsapp') || html.includes('واتساپ'), 'WhatsApp appointment booking CTA rendered');
  assert(!html.includes('undefined') && !html.includes('[object Object]'), 'No unrendered placeholders in generated HTML');
  assert(html.includes('manifest.webmanifest') || html.includes('application/manifest+json'), 'Offline PWA manifest metadata present');

  // Write out artifact for user preview
  const previewPath = path.join(__dirname, '../kabul_diagnostic_clinic_preview.html');
  fs.writeFileSync(previewPath, html, 'utf8');
  console.log(`  📄 Exported clinic preview HTML to: ${previewPath}\n`);

  // --------------------------------------------------------------------------
  // TEST B: CONVERSATIONAL NATURAL LANGUAGE UPDATE
  // --------------------------------------------------------------------------
  console.log('👉 [TEST B] Conversational Update Engine: Patch Clinic Fee & Thursday Hours');

  // Verify initial state
  const doctorNooriInitial = schema.clinic?.doctors.find(d => d.id === 'dr-noori' || d.name.en.includes('Noori'));
  console.log(`  ℹ️  Initial Dr. Noori Fee: ${doctorNooriInitial?.consultationFeeAfn} AFN`);
  console.log(`  ℹ️  Initial Thursday Status: ${schema.operatingHours.thursday?.status}`);

  // 1. English Prompt
  const promptEn = "Change Dr. Noori's consultation fee from 500 to 600 AFN and set Thursday as closed";
  const updateResultEn = await updateSiteConversational({
    tenantId,
    siteId: siteGenResult.siteId,
    existingSchema: schema,
    prompt: promptEn,
    publishToS3: false,
  });

  const updatedSchemaEn = updateResultEn.updatedSchema;
  const updatedDocEn = updatedSchemaEn.clinic?.doctors.find(d => d.id === 'dr-noori' || d.name.en.includes('Noori'));

  assert(updateResultEn.previousVersion === 1, 'Previous version was 1');
  assert(updateResultEn.newVersion === 2, 'Version incremented to 2');
  assert(updatedDocEn?.consultationFeeAfn === 600, 'Dr. Noori consultation fee updated to 600 AFN');
  assert(updatedSchemaEn.operatingHours.thursday?.status === 'closed', 'Thursday operating hours set to closed');
  assert(updateResultEn.confirmationMessage.language === 'en', 'Detected language is English');
  assert(
    updateResultEn.confirmationMessage.text.includes('600') &&
    updateResultEn.confirmationMessage.text.includes('Thursday'),
    'Localized confirmation returned in English'
  );
  assert(updateResultEn.compiledHtml.includes('600'), 'Compiled HTML contains updated 600 AFN fee');

  // 2. Dari Prompt
  const promptFa = 'قیمت معاینه داکتر نوری را از ۵۰۰ به ۶۰۰ افغانی تغییر بده و روز پنجشنبه را هم کلینیک را تعطیل کن';
  const updateResultFa = await updateSiteConversational({
    tenantId,
    siteId: siteGenResult.siteId,
    existingSchema: schema,
    prompt: promptFa,
    publishToS3: false,
  });
  assert(updateResultFa.confirmationMessage.language === 'fa', 'Detected Dari language for Persian prompt');
  assert(
    updateResultFa.confirmationMessage.text.includes('۶۰۰') || updateResultFa.confirmationMessage.text.includes('600'),
    'Localized Dari confirmation returned with updated fee'
  );

  // 3. Pashto Prompt
  const promptPs = 'د ډاکټر نوري فیس له ۵۰۰ څخه ۶۰۰ افغانیو ته بدل کړه او د پنجشنبې ورځ کلینیک بند کړه';
  const updateResultPs = await updateSiteConversational({
    tenantId,
    siteId: siteGenResult.siteId,
    existingSchema: schema,
    prompt: promptPs,
    publishToS3: false,
  });
  assert(updateResultPs.confirmationMessage.language === 'ps', 'Detected Pashto language for Pashto prompt');
  assert(
    updateResultPs.confirmationMessage.text.includes('۶۰۰') || updateResultPs.confirmationMessage.text.includes('600'),
    'Localized Pashto confirmation returned with updated fee'
  );

  console.log(`  💬 English confirmation: "${updateResultEn.confirmationMessage.text}"`);
  console.log(`  💬 Dari confirmation:    "${updateResultFa.confirmationMessage.text}"`);
  console.log(`  💬 Pashto confirmation:  "${updateResultPs.confirmationMessage.text}"\n`);

  // --------------------------------------------------------------------------
  // TEST C: CUSTOM APPLICATION RUNNER
  // --------------------------------------------------------------------------
  console.log('👉 [TEST C] Custom Application Runner: Node.js & Python Services');

  const appDeployResult = await deployCustomApp({
    tenantId,
    appName: 'api-kabul',
    framework: 'nodejs',
    gitRepoUrl: 'https://github.com/ariacloud-tenants/kabul-backend-api',
    cpu: 0.5,
    memory: 1.0,
    environmentVariables: {
      NODE_ENV: 'production',
      PORT: '3000',
    },
  });

  assert(appDeployResult.appName === 'api-kabul', 'App name parsed cleanly as api-kabul');
  assert(appDeployResult.framework === 'nodejs', 'Framework registered as nodejs');
  assert(appDeployResult.allocatedVcpu === 0.5, 'Allocated 0.5 vCPU for scale-to-zero economy');
  assert(appDeployResult.allocatedMemoryGb === 1.0, 'Allocated 1.0 GB RAM');
  assert(appDeployResult.publicUrl.includes('api-kabul.ariacloudservices.org'), 'Public subdomain routed to api-kabul.ariacloudservices.org');
  assert(appDeployResult.healthCheckUrl.endsWith('/health'), 'Health check endpoint configured');

  const statusCheck = await getAppDeploymentStatus(tenantId, appDeployResult.id);
  assert(statusCheck.status === 'running' || statusCheck.status === 'deploying', 'App deployment status retrieved');

  console.log(`  🚀 Service URL:       ${appDeployResult.publicUrl}`);
  console.log(`  🩺 Health Check URL:  ${appDeployResult.healthCheckUrl}`);
  console.log(`  📊 Status:            ${statusCheck.status}\n`);

  // --------------------------------------------------------------------------
  // TEST D: WHITE-LABEL BRAND LEAK AUDIT ON GENERATED CODE
  // --------------------------------------------------------------------------
  console.log('👉 [TEST D] White-Label Compliance: Verifying Zero Third-Party Leaks');

  const forbiddenTokens = [
    'AWS',
    'Amazon',
    'Bedrock',
    'Nova Micro',
    'Nova Canvas',
    'Nova Lite',
    'Llama',
    'ElevenLabs',
    '11Labs',
    'Route 53',
    'CloudFront',
    'SES Relay',
    'Meta Graph API',
  ];

  let leaksFound = 0;
  forbiddenTokens.forEach((token) => {
    // Check generated clinic HTML
    const regex = new RegExp(`\\b${token}\\b`, 'i');
    if (regex.test(html)) {
      console.error(`  🚨 FORBIDDEN TOKEN "${token}" found in generated HTML!`);
      leaksFound++;
    }
  });

  assert(leaksFound === 0, 'Zero third-party vendor leaks in generated HTML');

  // Summary
  console.log('\n===============================================================');
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running verification tests:', err);
  process.exit(1);
});
