import { CfnOutput, Duration, RemovalPolicy, Stack, aws_secretsmanager, aws_ssm } from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export interface CognitoPoolProps {
  readonly stage: string;
}

export class CognitoPool extends Stack {
  constructor(scope: Construct, id: string, props: CognitoPoolProps) {
    super(scope, id);
    const emailTemplate = `<html>
      <body
        style="
          background-color: #333;
          font-family: PT Sans, Trebuchet MS, sans-serif;
        "
      >
        <div
          style="
            margin: 0 auto;
            width: 600px;
            background-color: #fff;
            font-size: 1.2rem;
            font-style: normal;
            font-weight: normal;
            line-height: 19px;
            padding-top: 40px;
            padding-bottom: 100px;
          "
          align="center"
        >
          <div style="padding: 20">
            <img
              style="
                border: 0;
                display: block;
                height: auto;
                width: 100%;
                max-width: 373px;
              "
              alt="Animage"
              height="200"
              width="300"
              src="https://publish.example.com/main-logo.png"
            />
            <h2
              style="
                font-size: 28px;
                margin-top: 20px;
                margin-bottom: 0;
                font-style: normal;
                font-weight: bold;
                color: #000;
                font-size: 24px;
                line-height: 32px;
                text-align: center;
              "
            >
              Thank you for registering!
            </h2>
            <p
              style="
                margin-top: 20px;
                margin-bottom: 0;
                font-size: 16px;
                line-height: 24px;
                color: #000;
              "
            >
            Verify your account by clicking on
            <button style="
                padding-inline: 10px;
                background-color: transparent;
                border-radius: 5px;
                border: 1px solid black;
            ">{##Verify Email##}</button>.
            </p>
          </div>
        </div>
      </body>
    </html>`;
    const cognitoPool = new cognito.UserPool(this, "SampleCognitoPool", {
      userPoolName: `${props.stage}-SampleCognitoPool`,

      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      signInAliases: {
        email: true,
        phone: true,
      },
      autoVerify: {
        email: true,
      },
      userVerification: {
        emailSubject: "Hello from example app!",
        emailBody: emailTemplate,
        emailStyle: cognito.VerificationEmailStyle.LINK,
      },
      standardAttributes: {
        fullname: {
          required: true,
          mutable: true,
        },
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        company: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const domainPrefix = `${props.stage}-sample-auth-app`;
    cognitoPool.addDomain("SampleCognitoPoolDomain", {
      cognitoDomain: {
        domainPrefix,
      },
    });
    const client = cognitoPool.addClient("SampleAuthAppClient", {
      userPoolClientName: "SampleAuthAppClient",

      oAuth: {
        flows: { authorizationCodeGrant: true, implicitCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PHONE,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN,
        ],
        callbackUrls: ["http://localhost:4000/login"],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      refreshTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(30),
      accessTokenValidity: Duration.minutes(30),
    });

    const domainUrl = `https://${domainPrefix}.auth.${this.region}.amazoncognito.com`

    // Create an SSM Parameter
    new aws_ssm.StringParameter(this, "SampleCognitoUserPoolID", {
      parameterName: `/sample/${props.stage}/cognito-user-pool-id`,
      stringValue: cognitoPool.userPoolId,
      description: "Cognito User Pool ID",
      // Choose the tier based on your needs; the default is 'STANDARD'
      tier: aws_ssm.ParameterTier.STANDARD,
    });
    new aws_ssm.StringParameter(this, "SampleCognitoClientID", {
      parameterName: `/sample/${props.stage}/cognito-client-id`,
      stringValue: client.userPoolClientId,
      description: "Cognito client ID",
      // Choose the tier based on your needs; the default is 'STANDARD'
      tier: aws_ssm.ParameterTier.STANDARD,
    });
    // get cognito domain url
    new CfnOutput(this, "CognitoDomainUrl", {
      value: domainUrl ,
    });

    new CfnOutput(this, "AuthorizedRedirectUserPoolDomainUrl", {
      value: `${domainUrl}/oauth2/idpresponse`,
    });
  }
}
