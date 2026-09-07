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
import * as cognito from "aws-cdk-lib/aws-cognito";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";

dotenv.config();

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const billsTable = new dynamodb.Table(this, "BillsTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
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
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const fantasyTable = new dynamodb.Table(this, "FantasyTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const billsLambda = new lambda.Function(this, "LifeHubBillsHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda/bills"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: billsTable.tableName,
        USERS_TABLE: usersTable.tableName,
      },
    });

    const kitchenLambda = new lambda.Function(this, "KitchenHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda/kitchen"),
      handler: "kitchen.handler",
      environment: {
        TABLE_NAME: kitchenTable.tableName,
        USERS_TABLE: usersTable.tableName,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        WALMART_PUBLISHER_ID: process.env.WALMART_PUBLISHER_ID || "",
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const pokerLambda = new lambda.Function(this, "PokerHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda/poker"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: pokerTable.tableName,
        USERS_TABLE: usersTable.tableName,
      },
    });

    const fantasyLambda = new lambda.Function(this, "FantasyHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda/fantasy"),
      handler: "index.handler",
      environment: {
        TABLE_NAME: fantasyTable.tableName,
        USERS_TABLE: usersTable.tableName,
        FANTASY_ENC_KEY: process.env.FANTASY_ENC_KEY || "",
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    billsTable.grantReadWriteData(billsLambda);
    kitchenTable.grantReadWriteData(kitchenLambda);
    pokerTable.grantReadWriteData(pokerLambda);
    fantasyTable.grantReadWriteData(fantasyLambda);
    // Read for permission checks; write so each tool can record a
    // lastUsed<Tool> timestamp on the caller's profile for admin visibility.
    usersTable.grantReadWriteData(pokerLambda);
    usersTable.grantReadWriteData(fantasyLambda);
    usersTable.grantWriteData(billsLambda);
    usersTable.grantWriteData(kitchenLambda);

    const userPool = new cognito.UserPool(this, "LifeHubUserPool", {
      userPoolName: "LifeHubUsers",
      selfSignUpEnabled: false,
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
      preventUserExistenceErrors: true,
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
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    usersTable.grantReadWriteData(adminLambda);

    adminLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cognito-idp:AdminCreateUser", "cognito-idp:AdminDeleteUser"],
        resources: [userPool.userPoolArn],
      }),
    );

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
    const fantasyIntegration = new HttpLambdaIntegration(
      "FantasyIntegration",
      fantasyLambda,
    );

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

    httpApi.addRoutes({
      path: "/bills",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: billsIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/bills/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: billsIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/kitchen",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: kitchenIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/kitchen/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: kitchenIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/poker",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.POST,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: pokerIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/poker/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: pokerIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/poker/stats",
      methods: [apigw.HttpMethod.GET],
      integration: pokerIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/poker/mystats",
      methods: [apigw.HttpMethod.GET],
      integration: pokerIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/fantasy/leagues",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: fantasyIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/fantasy/leagues/{id}",
      methods: [apigw.HttpMethod.DELETE],
      integration: fantasyIntegration,
      authorizer,
    });

    httpApi.addRoutes({
      path: "/fantasy/guide",
      methods: [apigw.HttpMethod.GET],
      integration: fantasyIntegration,
      authorizer,
    });

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

    const distDir = path.join(__dirname, "../../dist");

    // Hashed build assets (filename changes whenever content does) — safe
    // to cache "forever". Deployed first, without pruning, so the second
    // deployment's prune pass doesn't race it.
    const assetsDeployment = new s3deploy.BucketDeployment(
      this,
      "DeployLifeHubAssets",
      {
        sources: [s3deploy.Source.asset(distDir, { exclude: ["index.html"] })],
        destinationBucket: websiteBucket,
        cacheControl: [
          s3deploy.CacheControl.setPublic(),
          s3deploy.CacheControl.maxAge(cdk.Duration.days(365)),
          s3deploy.CacheControl.immutable(),
        ],
        prune: false,
      },
    );

    // index.html must always be revalidated — it's the only thing that
    // references the current hashed asset filenames. Without this, a
    // browser (iOS home-screen web apps especially) can keep serving a
    // stale index.html that points at asset files a later deploy has
    // since deleted, leaving the page blank with no visible error.
    const indexDeployment = new s3deploy.BucketDeployment(
      this,
      "DeployLifeHubIndex",
      {
        sources: [s3deploy.Source.asset(distDir, { exclude: ["assets/**"] })],
        destinationBucket: websiteBucket,
        cacheControl: [s3deploy.CacheControl.noCache()],
        distribution,
        distributionPaths: ["/*"],
        prune: false,
      },
    );
    // Make sure the new hashed assets are actually in the bucket (and the
    // invalidation covers them) before the new index.html that points at
    // them goes live.
    indexDeployment.node.addDependency(assetsDeployment);

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
