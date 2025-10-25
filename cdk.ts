#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';


const secrets = { CLOUDFRONT_URL: process.env.CLOUDFRONT_URL, REGION: process.env.REGION, INVALIDATE_CACHE: process.env.INVALIDATE_CACHE } as const;

interface CustomStackProps extends cdk.StackProps {
	sources?: string;
}

const app = new cdk.App();

// You can pass context values here or get them from CLI --context
const sources = app.node.tryGetContext('sources') ?? 'build/client/';

class Stack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: CustomStackProps) {
		super(scope, id, props);

		const bucket = new s3.Bucket(this, 'WebsiteBucket', {
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			publicReadAccess: true,
			blockPublicAccess:s3.BlockPublicAccess.BLOCK_ACLS_ONLY,
			bucketName: "test-aws-cdk-lib",

		});

		new s3deploy.BucketDeployment(this, 'DeployWebsite', {
			sources: [s3deploy.Source.asset(props?.sources ?? 'build/client')],
			destinationBucket: bucket,
		});

		const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
			defaultBehavior: { origin: new origins.S3StaticWebsiteOrigin(bucket),  },
			defaultRootObject: 'index.html',
			comment: 'CloudFront distribution for the website',
		});

		new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
			value: distribution.distributionId,
			description: 'CloudFront Distribution ID',
		});

		new cdk.CfnOutput(this, 'CloudFrontURL', {
			value: distribution.distributionDomainName,
			description: 'CloudFront Distribution Domain Name',
		});
	}
}


new Stack(app, 'YourCdkAppStack', {
	env: { region: secrets.REGION ?? 'eu-central-1' },
	sources, // Custom prop you might use inside your stack
});

// How to handle cache invalidation ?
// 	You should explicitly run a CloudFront cache invalidation in your GitHub Actions deploy workflow after you upload new content to S3.

// Example invalidation CLI command:

// aws cloudfront create - invalidation--distribution - id YOUR_DISTRIBUTION_ID--paths "/*"
