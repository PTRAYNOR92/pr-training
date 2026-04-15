// Placeholder — Azure resources for the PR Training App.
// Expand to provision: Static Web App (frontend), App Service (API), Key Vault, Application Insights.
// See SAD §3.1 for target SKUs.

@description('Environment name — staging | production')
param envName string

@description('Azure region')
param location string = resourceGroup().location

output envName string = envName
output location string = location
