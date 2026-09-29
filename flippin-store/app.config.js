// Extends app.json so EAS can inject google-services.json via the GOOGLE_SERVICES_JSON file env var.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'
  }
})
