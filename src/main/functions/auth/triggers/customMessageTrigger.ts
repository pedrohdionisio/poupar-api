import ForgotPassword from '@infra/emails/templates/ForgotPassword';
import { CustomMessageTriggerEvent } from 'aws-lambda';
import { render } from 'react-email';

export async function handler(event: CustomMessageTriggerEvent) {
	if (event.triggerSource === 'CustomMessage_ForgotPassword') {
		const code = event.request.codeParameter;

		const html = await render(ForgotPassword({ code }));

		event.response.emailSubject = '🍽️ waitr | Recupere a sua conta!';
		event.response.emailMessage = html;
	}

	return event;
}
