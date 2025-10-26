#!/usr/bin/env node
import "source-map-support/register.js"
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { ViewerProtocolPolicy, Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import type{ StackProps } from 'aws-cdk-lib';

import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';

import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
const app = new App();

const environment = app.node.tryGetContext('ENVIRONMENT') || 'stage';

interface S3CloudFrontStackProps extends StackProps {
	environment: string;
}

export class CdkSpaDeploymentOacStack extends Stack {
	constructor(scope: Construct, id: string, props: S3CloudFrontStackProps) {
		super(scope, id, props);

		// Simpler, cleaner, modernized method below

		const { environment } = props;

		const domainName = 'casneil.live'

		const hostedZone = new HostedZone(
			this,
			'HostedZone',
			{
				zoneName: domainName
			}
		);

		const certificate = new Certificate(
			this,
			'Cert',
			{
				domainName,
				validation: CertificateValidation.fromDns(hostedZone)
			}
		);

		// Dynamically name the S3 bucket based on the environment
		const bucket = new Bucket(this, `${app.node.id}-bucket-${environment}`, {
			bucketName: `cdk-test-bucket-${environment}`,
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true
		});

		const dist = new Distribution(this, 'Distribution', {
			defaultRootObject: 'index.html',
			defaultBehavior: {
				// Using new S3BucketOrigin construct with OAC functionality built in! aws-cdk (and lib) version 2.156.0 and up
				origin: S3BucketOrigin.withOriginAccessControl(bucket),
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
			},
			domainNames: [domainName],
			certificate,
		});

		new ARecord(
			this,
			'ARecord',
			{
				zone: hostedZone,
				target: RecordTarget.fromAlias(new CloudFrontTarget(dist))
			}
		);
	}
}

new CdkSpaDeploymentOacStack(app, `S3CloudFrontOACStack-${environment}`, {
	environment: environment,
});


// How to handle cache invalidation ?
// 	You should explicitly run a CloudFront cache invalidation in your GitHub Actions deploy workflow after you upload new content to S3.

// Example invalidation CLI command:

// aws cloudfront create - invalidation--distribution - id YOUR_DISTRIBUTION_ID--paths "/*"
