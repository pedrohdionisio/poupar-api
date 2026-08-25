export interface IQueueConsumer<TMessage> {
	process(message: TMessage): Promise<void>;
}
