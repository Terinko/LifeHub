import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as dotenv from "dotenv";
import * as iam from "aws-cdk-lib/aws-iam";

// 1. IMPORT COGNITO & AUTHORIZER
import * as cognito from "aws-cdk-lib/aws-cognito";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";

// Load environment variables from .env file
dotenv.config();

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================================
    // 1. DATABASE (DynamoDB)
    // ==========================================
    const billsTable = new dynamodb.Table(this, "BillsTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING }, // <-- Added Sort Key
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const kitchenTable = new dynamodb.Table(this, "KitchenTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const pokerTable = new dynamodb.Table(this, "PokerTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING }, // Will hold "USER#<sub_id>"
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ==========================================
    // 2. BACKEND LOGIC (Lambda)
    // ==========================================
    const billsLambda = new lambda.Function(this, "LifeHubBillsHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda/bills"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: billsTable.tableName,
      },
    });

    const kitchenLambda = new lambda.Function(this, "KitchenHandler", {
      runtime: lambda.Runtime.NODEJS_20_X, // Note: Updated to 20_X as 24_X is not yet standard in CDK
      code: lambda.Code.fromAsset("lambda/kitchen"),
      handler: "kitchen.handler",
      environment: {
        TABLE_NAME: kitchenTable.tableName,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        WALMART_PUBLISHER_ID: process.env.WALMART_PUBLISHER_ID || "",
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const pokerLambda = new lambda.Function(this, "PokerHandler", {
      runtime: lambda.Runtime.NODEJS_20_X, // Standardized runtime
      code: lambda.Code.fromAsset("lambda/poker"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: pokerTable.tableName,
      },
    });

    billsTable.grantReadWriteData(billsLambda);
    kitchenTable.grantReadWriteData(kitchenLambda);
    pokerTable.grantReadWriteData(pokerLambda);

    // ==========================================
    // 3. COGNITO AUTHENTICATION (The Vault)
    // ==========================================
    const userPool = new cognito.UserPool(this, "LifeHubUserPool", {
      userPoolName: "LifeHubUsers",
      selfSignUpEnabled: false, // Security: Only you can invite users
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      userInvitation: {
        emailSubject: "You've been invited to LifeHub!",
        emailBody: `
          <p>Hello {username}!</p>
          <p>You have been invited to join a LifeHub dashboard.</p>
          <p>Your temporary password is: <strong>{####}</strong></p>
          <p>Please click the link below to log in and set your permanent password:</p>
          <p><a href="https://d1fmolh4piuxo4.cloudfront.net/">Access LifeHub Here</a></p>
        `,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "LifeHubClient", {
      userPool,
      preventUserExistenceErrors: true, // Security: Hides if an email is registered or not
    });

    const authorizer = new HttpUserPoolAuthorizer(
      "LifeHubAuthorizer",
      userPool,
      {
        userPoolClients: [userPoolClient],
      },
    );

    const adminLambda = new lambda.Function(this, "AdminHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda/admin"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: usersTable.tableName,
        USER_POOL_ID: userPool.userPoolId, // Tells the Lambda which pool to invite users to
      },
    });

    usersTable.grantReadWriteData(adminLambda);

    // CRITICAL: Give the Lambda permission to create users in Cognito
    adminLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminCreateUser", "cognito-idp:AdminDeleteUser"],
        resources: [userPool.userPoolArn],
      }),
    );

    // ==========================================
    // 4. API ROUTING (API Gateway v2 HTTP API)
    // ==========================================
    const httpApi = new apigw.HttpApi(this, "LifeHubHttpApi", {
      corsPreflight: {
        allowHeaders: ["*"],
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PUT,
          apigw.CorsHttpMethod.DELETE,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ["*"],
      },
    });

    const billsIntegration = new HttpLambdaIntegration(
      "BillsIntegration",
      billsLambda,
    );
    const kitchenIntegration = new HttpLambdaIntegration(
      "KitchenIntegration",
      kitchenLambda,
    );
    const pokerIntegration = new HttpLambdaIntegration(
      "PokerIntegration",
      pokerLambda,
    );

    const adminIntegration = new HttpLambdaIntegration(
      "AdminIntegration",
      adminLambda,
    );

    // Route: /admin/users (GET list of users, POST new invites, PUT permission updates)
    httpApi.addRoutes({
      path: "/admin/users",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: adminIntegration,
      authorizer,
    });

    // Route 1: /bills
    httpApi.addRoutes({
      path: "/bills",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: billsIntegration,
      authorizer, // <-- ATTACHED
    });

    // Route 2: /bills/{id}
    httpApi.addRoutes({
      path: "/bills/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: billsIntegration,
      authorizer, // <-- ATTACHED
    });

    // Route 3: /kitchen
    httpApi.addRoutes({
      path: "/kitchen",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: kitchenIntegration,
      authorizer, // <-- ATTACHED
    });

    // Route 4: /kitchen/{id}
    httpApi.addRoutes({
      path: "/kitchen/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: kitchenIntegration,
      authorizer, // <-- ATTACHED
    });

    // Route 5: /poker
    httpApi.addRoutes({
      path: "/poker",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: pokerIntegration,
      authorizer, // <-- ATTACHED
    });

    // Route 6: /poker/{id}
    httpApi.addRoutes({
      path: "/poker/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: pokerIntegration,
      authorizer, // <-- ATTACHED
    });

    // ==========================================
    // 5. FRONTEND HOSTING (S3 & CloudFront)
    // ==========================================
    const websiteBucket = new s3.Bucket(this, "LifeHubFrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(
      this,
      "LifeHubFrontendDistribution",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(websiteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      },
    );

    new s3deploy.BucketDeployment(this, "DeployLifeHubWebsite", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../dist"))],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ["/*"],
    });

    // ==========================================
    // 6. TERMINAL OUTPUTS
    // ==========================================
    new cdk.CfnOutput(this, "ApiEndpointUrl", {
      value: httpApi.url!,
      description: "The base URL for your API Gateway",
    });

    new cdk.CfnOutput(this, "FrontendURL", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Your Live React App Website Link",
    });

    new cdk.CfnOutput(this, "S3BucketName", {
      value: websiteBucket.bucketName,
      description: "Upload your React dist folder to this S3 bucket",
    });

    // NEW: Outputs required for React Amplify configuration
    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: userPool.userPoolId,
      description: "The ID of the Cognito User Pool (For Amplify config)",
    });

    new cdk.CfnOutput(this, "CognitoClientId", {
      value: userPoolClient.userPoolClientId,
      description: "The Client ID for the User Pool (For Amplify config)",
    });
  }
}
