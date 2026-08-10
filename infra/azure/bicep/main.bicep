// Top-level Azure resources for the PR Training App.
// See SAD §3.1 for target SKUs. Static Web App, App Service, Key Vault, and
// Application Insights are tracked separately — this file currently provisions
// Azure OpenAI (AI-001).

@description('Environment name — staging | production')
param envName string

@description('Azure region')
param location string = resourceGroup().location

@description('Capacity (thousand tokens/minute) for the Azure OpenAI deployment')
param openAICapacityTpm int = 10

// AI-001 — Azure OpenAI provisioning (resource + gpt-4o-mini deployment).
module openai './modules/openai.bicep' = {
  name: 'openai-${envName}'
  params: {
    envName: envName
    location: location
    capacityTpm: openAICapacityTpm
  }
}

output envName string = envName
output location string = location
output openAIEndpoint string = openai.outputs.endpoint
output openAIDeploymentName string = openai.outputs.deploymentName
