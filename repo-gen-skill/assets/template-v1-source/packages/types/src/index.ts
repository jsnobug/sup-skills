export interface DemoMessage {
  id: string;
  title: string;
  content: string;
  source: 'server';
  generatedAt: string;
}

export interface DemoApiResponse {
  ok: true;
  service: 'server';
  message: DemoMessage;
  sharedTypesPackage: '@monorepo-templates/types';
}
