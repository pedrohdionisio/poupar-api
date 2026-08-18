import { Column } from '@react-email/column';
import { Heading } from '@react-email/heading';
import { Html } from '@react-email/html';
import { Row } from '@react-email/row';
import { Section } from '@react-email/section';
// biome-ignore lint/correctness/noUnusedImports: <>
import React from 'react';
import { TailwindConfig } from '../components/TailwindConfig';

export interface IForgotPasswordProps {
	code: string;
}

export default function ForgotPassword({ code }: IForgotPasswordProps) {
	return (
		<TailwindConfig>
			<Html className='font-sans'>
				<Section>
					<Row>
						<Column className='text-center pt-10'>
							<Heading as='h1' className='text-2xl leading-[0]'>
								Recupere a sua conta
							</Heading>

							<Heading as='h2' className='font-normal text-base text-gray-400'>
								Resete a sua senha
							</Heading>
						</Column>
					</Row>

					<Row>
						<Column className='text-center pt-2'>
							<span className='inline-block px-8 py-4 text-3xl font-bold rounded-md bg-gray-200 tracking-[16px] text-center'>
								{code}
							</span>
						</Column>
					</Row>

					<Row>
						<Column className='text-center'>
							<Heading as='h2' className='font-normal text-sm text-gray-800'>
								Se você não solicitou essa troca, fique tranquilo, sua conta
								continua segura!
							</Heading>
						</Column>
					</Row>
				</Section>
			</Html>
		</TailwindConfig>
	);
}

ForgotPassword.PreviewProps = {
	code: '234566'
};
