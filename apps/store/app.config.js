const fs = require('fs')
const path = require('path')

// Extends app.json: drops Firebase config when google-services.json is absent
// and reads the EAS project id from the environment.
module.exports = ({ config }) => {
  if (!fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    delete config.android.googleServicesFile
  }
  if (process.env.EAS_PROJECT_ID) {
    config.extra = { ...config.extra, eas: { projectId: process.env.EAS_PROJECT_ID } }
  }
  return config
}
