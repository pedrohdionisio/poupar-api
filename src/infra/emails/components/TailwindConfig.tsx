import { Tailwind } from '@react-email/tailwind';
import React from 'react';

interface ITailwindConfigProps {
	children: React.ReactNode;
}

export function TailwindConfig({ children }: ITailwindConfigProps) {
	return (
		<Tailwind
			config={{
				theme: {
					extend: {
						colors: {
							waitr: {
								green: '#D73035'
							},
							gray: {
								600: '#A1A1AA'
							}
						}
					}
				}
			}}
		>
			{children}
		</Tailwind>
	);
}
