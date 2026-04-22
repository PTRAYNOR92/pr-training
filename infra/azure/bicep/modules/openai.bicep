// AI-001 — Azure OpenAI (Cognitive Services) account and model deployment.
// Deploys an S0 OpenAI resource with a gpt-4o-mini deployment so AI processing
// stays inside the Azure compliance boundary (Solution Architecture §5.2).

@description('Environment name — staging | production')
param envName string

@description('Azure region')
param location string

@description('Name of the OpenAI account. Must be globally unique.')
param accountName string = 'pr-training-openai-${envName}'

@description('Name of the model deployment')
param deploymentName string = 'gpt-4o-mini'

@description('Model version to deploy')
param modelVersion string = '2024-07-18'

@description('TPM (thousand tokens per minute) capacity for the deployment')
@minValue(1)
@maxValue(100)
param capacityTpm int = 10

resource openAI 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: accountName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
    customSubDomainName: accountName
  }
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openAI
  name: deploymentName
  sku: {
    name: 'Standard'
    capacity: capacityTpm
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: modelVersion
    }
    raiPolicyName: 'Microsoft.DefaultV2'
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

output endpoint string = openAI.properties.endpoint
output deploymentName string = deployment.name
output accountId string = openAI.id
