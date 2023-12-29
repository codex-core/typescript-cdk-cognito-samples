#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { isEmpty } from 'lodash'
import { CognitoPool } from '../lib/cognito';
const app = new cdk.App();
const context = app.node.tryGetContext('env')
const env =  isEmpty(context)? "dev" : context;
//TODO: get env vars from context
new CognitoPool(app, `SampleCognitoPool`, {stage: env});
