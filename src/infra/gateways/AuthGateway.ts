import { createHmac } from 'node:crypto';

import { ExpiredResetPasswordCode } from '@application/errors/application/ExpiredResetPasswordCode';
import { InvalidCredentials } from '@application/errors/application/InvalidCredentials';
import { InvalidRefreshToken } from '@application/errors/application/InvalidRefreshToken';
import { ResetPasswordCodeWrong } from '@application/errors/application/ResetPasswordCodeWrong';
import { UserNotFound } from '@application/errors/application/UserNotFound';
import {
	AdminAddUserToGroupCommand,
	AdminDeleteUserCommand,
	CodeMismatchException,
	ConfirmForgotPasswordCommand,
	ExpiredCodeException,
	ForgotPasswordCommand,
	GetTokensFromRefreshTokenCommand,
	InitiateAuthCommand,
	NotAuthorizedException,
	SignUpCommand,
	UserNotFoundException
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '@infra/clients/cognitoClient';
import { Injectable } from '@kernel/decorators/Injectable';
import { AppConfig } from '@shared/config/AppConfig';

@Injectable()
export class AuthGateway {
	constructor(private readonly appConfig: AppConfig) {}

	async signUp({
		email,
		password,
		internalId
	}: AuthGateway.SignUpParams): Promise<AuthGateway.SignUpResult> {
		const command = new SignUpCommand({
			ClientId: this.appConfig.auth.cognito.client.id,
			Username: email,
			Password: password,
			UserAttributes: [
				{
					Name: 'custom:internalId',
					Value: internalId
				}
			],
			SecretHash: this.getSecretHash(email)
		});

		const { UserSub } = await cognitoClient.send(command);

		if (!UserSub) {
			throw new Error(`Cannot signup user: ${email}`);
		}

		return {
			externalId: UserSub
		};
	}

	async signIn({
		email,
		password
	}: AuthGateway.SignInParams): Promise<AuthGateway.SignInResult> {
		try {
			const command = new InitiateAuthCommand({
				ClientId: this.appConfig.auth.cognito.client.id,
				AuthFlow: 'USER_PASSWORD_AUTH',
				AuthParameters: {
					USERNAME: email,
					PASSWORD: password,
					SECRET_HASH: this.getSecretHash(email)
				}
			});

			const { AuthenticationResult } = await cognitoClient.send(command);

			if (
				!AuthenticationResult ||
				!AuthenticationResult.AccessToken ||
				!AuthenticationResult.RefreshToken
			) {
				throw new Error(`Cannot signin user: ${email}`);
			}

			return {
				accessToken: AuthenticationResult.AccessToken,
				refreshToken: AuthenticationResult.RefreshToken
			};
		} catch (error) {
			if (error instanceof NotAuthorizedException) {
				throw new InvalidCredentials();
			}

			throw error;
		}
	}

	async refreshToken({
		refreshToken
	}: AuthGateway.RefreshTokenParams): Promise<AuthGateway.RefreshTokenResult> {
		try {
			const command = new GetTokensFromRefreshTokenCommand({
				ClientId: this.appConfig.auth.cognito.client.id,
				ClientSecret: this.appConfig.auth.cognito.client.secret,
				RefreshToken: refreshToken
			});

			const { AuthenticationResult } = await cognitoClient.send(command);

			if (
				!AuthenticationResult ||
				!AuthenticationResult.AccessToken ||
				!AuthenticationResult.RefreshToken
			) {
				throw new Error('Cannot refresh token');
			}

			return {
				accessToken: AuthenticationResult.AccessToken,
				refreshToken: AuthenticationResult.RefreshToken
			};
		} catch {
			throw new InvalidRefreshToken();
		}
	}

	async forgotPassword({
		email
	}: AuthGateway.ForgotPasswordParams): Promise<void> {
		try {
			const command = new ForgotPasswordCommand({
				ClientId: this.appConfig.auth.cognito.client.id,
				SecretHash: this.getSecretHash(email),
				Username: email
			});

			await cognitoClient.send(command);
		} catch (error) {
			if (error instanceof UserNotFoundException) {
				throw new UserNotFound();
			}

			throw error;
		}
	}

	async resetPassword({
		email,
		code,
		password
	}: AuthGateway.ResetPasswordParams): Promise<void> {
		try {
			const command = new ConfirmForgotPasswordCommand({
				ClientId: this.appConfig.auth.cognito.client.id,
				SecretHash: this.getSecretHash(email),
				ConfirmationCode: code,
				Username: email,
				Password: password
			});

			await cognitoClient.send(command);
		} catch (error) {
			if (error instanceof CodeMismatchException) {
				throw new ResetPasswordCodeWrong();
			}

			if (error instanceof ExpiredCodeException) {
				throw new ExpiredResetPasswordCode();
			}

			if (error instanceof UserNotFoundException) {
				throw new UserNotFound();
			}

			throw error;
		}
	}

	async deleteUser({ externalId }: AuthGateway.DeleteUserParams) {
		const command = new AdminDeleteUserCommand({
			UserPoolId: this.appConfig.auth.cognito.pool.id,
			Username: externalId
		});

		await cognitoClient.send(command);
	}

	private getSecretHash(email: string): string {
		const { id, secret } = this.appConfig.auth.cognito.client;

		return createHmac('SHA256', secret)
			.update(`${email}${id}`)
			.digest('base64');
	}

	async addUserToGroup({
		externalId,
		group
	}: AuthGateway.AddUserToGroupParams): Promise<void> {
		const command = new AdminAddUserToGroupCommand({
			GroupName: group,
			Username: externalId,
			UserPoolId: this.appConfig.auth.cognito.pool.id
		});

		await cognitoClient.send(command);
	}
}

export namespace AuthGateway {
	export type SignUpParams = {
		email: string;
		password: string;
		internalId: string;
	};

	export type SignUpResult = {
		externalId: string;
	};

	export type SignInParams = {
		email: string;
		password: string;
	};

	export type SignInResult = {
		accessToken: string;
		refreshToken: string;
	};

	export type RefreshTokenParams = {
		refreshToken: string;
	};

	export type RefreshTokenResult = {
		accessToken: string;
		refreshToken: string;
	};

	export type ForgotPasswordParams = {
		email: string;
	};

	export type ResetPasswordParams = {
		email: string;
		code: string;
		password: string;
	};

	export type DeleteUserParams = {
		externalId: string;
	};

	export type AddUserToGroupParams = {
		externalId: string;
		group: string;
	};
}
