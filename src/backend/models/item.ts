import { ObjectId } from 'mongodb';

export interface Item {
    _id?: ObjectId;
    id?: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface CreateItemRequest {
    name: string;
    description: string;
}

export interface UpdateItemRequest {
    name?: string;
    description?: string;
}