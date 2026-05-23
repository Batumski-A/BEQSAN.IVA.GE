import { adminApi as api, unwrap, type ApiResponse } from '../api';

export type SocialPlatform = 'Facebook' | 'Instagram';

export type InboxChannel =
  | 'InstagramDm'
  | 'FacebookMessenger'
  | 'InstagramComment'
  | 'FacebookComment';

export type SocialPage = {
  id: string;
  metaPageId: string;
  name: string;
  igUserId: string | null;
  igUsername: string | null;
  isActive: boolean;
  connectedAtUtc: string;
};

export type SocialAccount = {
  id: string;
  metaUserId: string;
  displayName: string;
  connectedAtUtc: string;
  lastRefreshedAtUtc: string;
  isActive: boolean;
  pages: SocialPage[];
};

export type StartConnectResponse = {
  authorizeUrl: string;
  state: string;
};

export type InboxThread = {
  id: string;
  pageId: string;
  pageName: string;
  channel: InboxChannel;
  participantName: string;
  lastMessagePreview: string;
  lastMessageAtUtc: string;
  hasUnread: boolean;
};

export type InboxMessage = {
  id: string;
  direction: 'Inbound' | 'Outbound';
  authorName: string;
  text: string;
  attachmentUrl: string | null;
  atUtc: string;
};

export type ThreadMessages = {
  threadId: string;
  channel: InboxChannel;
  participantName: string;
  messages: InboxMessage[];
};

export type PublishTarget = { pageId: string; platform: SocialPlatform };

export type PublishedPost = {
  id: string;
  pageId: string;
  platform: SocialPlatform;
  status: 'Draft' | 'Publishing' | 'Published' | 'Failed';
  externalPostId: string | null;
  permalink: string | null;
  failureReason: string | null;
};

export type PublishResponse = {
  composerId: string;
  posts: PublishedPost[];
};

export const socialApi = {
  startConnect: async (): Promise<StartConnectResponse> => {
    const { data } = await api.post<ApiResponse<StartConnectResponse>>('/api/v1/admin/social/connect');
    return unwrap(data);
  },
  completeConnect: async (code: string, state: string): Promise<{ accountId: string; pagesConnected: number }> => {
    const { data } = await api.post<ApiResponse<{ accountId: string; pagesConnected: number }>>(
      '/api/v1/admin/social/connect/callback',
      { code, state },
    );
    return unwrap(data);
  },
  listAccounts: async (): Promise<SocialAccount[]> => {
    const { data } = await api.get<ApiResponse<SocialAccount[]>>('/api/v1/admin/social/accounts');
    return unwrap(data);
  },
  disconnectAccount: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/admin/social/accounts/${id}`);
  },
  publishPost: async (
    caption: string,
    imageUrls: string[],
    targets: PublishTarget[],
  ): Promise<PublishResponse> => {
    const { data } = await api.post<ApiResponse<PublishResponse>>('/api/v1/admin/social/posts', {
      caption,
      imageUrls,
      targets,
    });
    return unwrap(data);
  },
  listInbox: async (limit = 50): Promise<InboxThread[]> => {
    const { data } = await api.get<ApiResponse<InboxThread[]>>(`/api/v1/admin/social/inbox?limit=${limit}`);
    return unwrap(data);
  },
  getThread: async (threadId: string): Promise<ThreadMessages> => {
    const { data } = await api.get<ApiResponse<ThreadMessages>>(`/api/v1/admin/social/inbox/${threadId}`);
    return unwrap(data);
  },
  reply: async (threadId: string, text: string): Promise<void> => {
    await api.post<ApiResponse<unknown>>(`/api/v1/admin/social/inbox/${threadId}/reply`, { text });
  },
  draftCaption: async (topic: string, tonality?: string): Promise<string> => {
    const { data } = await api.post<ApiResponse<{ caption: string }>>('/api/v1/admin/social/ai/caption', {
      topic,
      tonality,
    });
    return unwrap(data).caption;
  },
  suggestReply: async (threadId: string): Promise<string> => {
    const { data } = await api.post<ApiResponse<{ suggestion: string }>>('/api/v1/admin/social/ai/reply', {
      threadId,
    });
    return unwrap(data).suggestion;
  },
};
