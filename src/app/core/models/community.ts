export interface CommunityLanguage {
  _id: string;
  name: string;
  nativeName: string;
  iso639_1?: string;
  iso639_2?: string;
  iso639_3?: string;
}

// community.ts
export interface Community {
  _id: string;
  name: string;
  language?: CommunityLanguage;
  description?: string;
  memberCount: number;
  createdBy: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  tags?: string[];
  isPrivate?: boolean;
  coverImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// community-member.ts
export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  joinedAt: Date;
  role: 'member' | 'moderator' | 'admin';
}
