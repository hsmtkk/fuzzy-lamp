// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from "constructs";
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace, TerraformAsset, AssetType } from "cdktf";
import * as google from '@cdktf/provider-google';
import * as path from 'path';

const project = 'fuzzy-lamp';
const region = 'us-central1';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new google.provider.GoogleProvider(this, 'google', {
      project,
      region,
    });

    const weatherDataset = new google.bigqueryDataset.BigqueryDataset(this, 'weatherDataset', {
      datasetId: 'average_weather',
    });

    const weatherTableSchema = `[
{
"name": "location",
"type": "GEOGRAPHY",
"mode": "REQUIRED"
},
{
"name": "average_temperature",
"type": "INTEGER",
"mode": "REQUIRED"
},
{
"name": "month",
"type": "STRING",
"mode": "REQUIRED"
},
{
"name": "inches_of_rain",
"type": "NUMERIC"
},
{
"name": "is_current",
"type": "BOOLEAN"
},
{
"name": "latest_measurement",
"type": "DATE"
}
]`;

    new google.bigqueryTable.BigqueryTable(this, 'weatherTable', {
      datasetId: weatherDataset.datasetId,
      schema: weatherTableSchema,
      tableId: 'average_weather',
    });

    const workflowBucket = new google.storageBucket.StorageBucket(this, 'workflowBucket', {
      location: region,
      name: `workflow-bucket-${project}`,
    });

    const inputFile = new TerraformAsset(this, 'inputFile', {
      path: path.resolve('files/inputFile.txt'),
      type: AssetType.FILE,
    });

    const jsonSchema = new TerraformAsset(this, 'jsonSchema', {
      path: path.resolve('files/jsonSchema.json'),
      type: AssetType.FILE,
    });

    const transformer = new TerraformAsset(this, 'transformer', {
      path: path.resolve('files/transformCSVtoJSON.js'),
      type: AssetType.FILE,
    });

    new google.storageBucketObject.StorageBucketObject(this, 'inputFileObject', {
      bucket: workflowBucket.name,
      name: inputFile.fileName,
      source: inputFile.path,
    });

    new google.storageBucketObject.StorageBucketObject(this, 'jsonSchemaObject', {
      bucket: workflowBucket.name,
      name: jsonSchema.fileName,
      source: jsonSchema.path,
    });

    new google.storageBucketObject.StorageBucketObject(this, 'transformerObject', {
      bucket: workflowBucket.name,
      name: transformer.fileName,
      source: transformer.path,
    });

    new google.composerEnvironment.ComposerEnvironment(this, 'composerEnvironment', {
      name: 'test',
    });

  }
}

const app = new App();
const stack = new MyStack(app, "fuzzy-lamp");
new CloudBackend(stack, {
  hostname: "app.terraform.io",
  organization: "hsmtkkdefault",
  workspaces: new NamedCloudWorkspace("fuzzy-lamp")
});
app.synth();
