import { Request, Response } from "express";
import { PublicService } from "../service/public.service";
import catchError from "../utils/catchError";

export class PublicController {
    static async getServicesOrProducts(req: Request, res: Response) {
        const { type, category, page, limit } = req.query;

        if (!type || (type !== 'service' && type !== 'product')) {
            return res.status(400).json({
                success: false,
                message: 'Type parameter is required and must be either "service" or "product"',
                code: 'VALIDATION_ERROR'
            });
        }

        const [error, result] = await catchError(
            PublicService.getServicesOrProducts({
                type: type as 'service' | 'product',
                category: category as string,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined
            })
        );

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch data',
                code: 'SERVER_ERROR'
            });
        }

        return res.status(200).json({
            success: true,
            message: `${type}s fetched successfully`,
            data: result?.data,
            pagination: {
                total: result?.total,
                page: result?.page,
                pages: result?.pages,
                limit: result?.limit
            }
        });
    }
}