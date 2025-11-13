import Invoice from '../models/invoice.model';
import Business from '../models/business.model';
import catchError from '../utils/catchError';
import { Schema } from 'mongoose';

export class InvoiceService {
    
    static async getInvoices(userId: string, userRole: string, filters: any) {
        const { status, startDate, endDate, businessId, minAmount, maxAmount, page = 1, limit = 10, sortBy = 'newest' } = filters;

        const query: any = {};
        let businessIds: Schema.Types.ObjectId[] = [];

        if (userRole === 'admin') {
            // Admin sees all invoices
        } else if (userRole === 'distributor' || userRole === 'manufacturer') {
            const [error, businesses] = await catchError(Business.find({ userId }).select('_id'));
            if (error) throw error;
            businessIds = businesses?.map(b => b._id) || [];
            query.$or = [
                { userId },
                { businessIds: { $in: businessIds } }
            ];
        } else {
            query.userId = userId;
        }

        if (status) query.status = status;
        if (businessId) query.businessIds = businessId;
        if (startDate || endDate) {
            query.invoiceDate = {};
            if (startDate) query.invoiceDate.$gte = new Date(startDate);
            if (endDate) query.invoiceDate.$lte = new Date(endDate);
        }
        if (minAmount || maxAmount) {
            query.amount = {};
            if (minAmount) query.amount.$gte = Number(minAmount);
            if (maxAmount) query.amount.$lte = Number(maxAmount);
        }

        let sortOption: any = { invoiceDate: -1 };
        if (sortBy === 'oldest') sortOption = { invoiceDate: 1 };
        if (sortBy === 'amount_high') sortOption = { amount: -1 };
        if (sortBy === 'amount_low') sortOption = { amount: 1 };

        const skip = (Number(page) - 1) * Number(limit);

        const [error, invoices] = await catchError(
            Invoice.find(query)
                .populate('userId', 'firstName lastName email')
                .populate('businessIds', 'businessName email')
                .populate('orderId')
                .sort(sortOption)
                .skip(skip)
                .limit(Number(limit))
        );
        if (error) throw error;

        const [countError, total] = await catchError(Invoice.countDocuments(query));
        if (countError) throw countError;

        // Calculate business-specific amounts
        let processedInvoices: any = invoices;
        if ((userRole === 'distributor' || userRole === 'manufacturer') && businessIds.length > 0) {
            processedInvoices = await Promise.all(invoices?.map(async (invoice) => {
                const inv = invoice.toObject();
                const isBusinessInvoice = inv.businessIds.some((bid: any) => 
                    businessIds.some(myBid => myBid.toString() === bid._id.toString())
                );
                
                if (isBusinessInvoice && inv.userId.toString() !== userId.toString()) {
                    if (inv.orderId && typeof inv.orderId === 'object' && 'items' in inv.orderId) {
                        const myBusinessId = businessIds.find(bid => 
                            inv.businessIds.some((invBid: any) => invBid._id.toString() === bid.toString())
                        );
                        
                        if (myBusinessId) {
                            const order = inv.orderId as any;
                            const businessAmount = order.items
                                .filter((item: any) => item.businessId.toString() === myBusinessId.toString())
                                .reduce((sum: number, item: any) => sum + item.totalPriceOfItems, 0);
                            inv.amount = businessAmount;
                        }
                    } else {
                        inv.amount = inv.amount - inv.platformFee;
                    }
                }
                return inv;
            }) || []);
        }

        return {
            invoices: processedInvoices,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total! / Number(limit)),
                limit: Number(limit)
            }
        };
    }

    static async fetchFinanceAnalytics(userId: string, userRole: string, filters: any) {
        const { period, startDate, endDate } = filters;

        let dateFilter: any = {};
        const now = new Date();

        if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { invoiceDate: { $gte: weekAgo } };
        } else if (period === 'month') {
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            dateFilter = { invoiceDate: { $gte: monthAgo } };
        } else if (period === 'year') {
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            dateFilter = { invoiceDate: { $gte: yearAgo } };
        } else if (period === 'this_year') {
            dateFilter = { invoiceDate: { $gte: new Date(now.getFullYear(), 0, 1) } };
        } else if (startDate && endDate) {
            dateFilter = { invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) } };
        }

        let matchQuery: any = { ...dateFilter };
        let businessIds: Schema.Types.ObjectId[] = [];

        if (userRole === 'admin') {
            // Admin sees all
        } else if (userRole === 'distributor' || userRole === 'manufacturer') {
            const [error, businesses] = await catchError(Business.find({ userId }).select('_id'));
            if (error) throw error;
            businessIds = businesses?.map(b => b._id) || [];
            matchQuery.$or = [
                { userId },
                { businessIds: { $in: businessIds } }
            ];
        } else {
            matchQuery.userId = userId;
        }

        const [error, analytics] = await catchError(
            Invoice.aggregate([
                { $match: matchQuery },
                {
                    $facet: {
                        totalStats: [
                            {
                                $group: {
                                    _id: null,
                                    totalRevenue: { $sum: '$amount' },
                                    totalPlatformFees: { $sum: '$platformFee' },
                                    averageTransaction: { $avg: '$amount' },
                                    totalTransactions: { $sum: 1 }
                                }
                            }
                        ],
                        byStatus: [
                            {
                                $group: {
                                    _id: '$status',
                                    count: { $sum: 1 },
                                    totalAmount: { $sum: '$amount' }
                                }
                            }
                        ],
                        monthlyTrend: [
                            {
                                $group: {
                                    _id: {
                                        year: { $year: '$invoiceDate' },
                                        month: { $month: '$invoiceDate' }
                                    },
                                    revenue: { $sum: '$amount' },
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { '_id.year': 1, '_id.month': 1 } }
                        ],
                        yearlyTrend: [
                            {
                                $group: {
                                    _id: { year: { $year: '$invoiceDate' } },
                                    revenue: { $sum: '$amount' },
                                    count: { $sum: 1 }
                                }
                            },
                            { $sort: { '_id.year': 1 } }
                        ]
                    }
                }
            ])
        );
        if (error) throw error;

        const result = analytics?.[0] || {};
        const totalStats = result.totalStats?.[0] || {};

        // Adjust for business owners
        if ((userRole === 'distributor' || userRole === 'manufacturer') && businessIds.length > 0) {
            const [invError, businessInvoices] = await catchError(
                Invoice.find({
                    businessIds: { $in: businessIds },
                    userId: { $ne: userId },
                    ...dateFilter
                }).populate('orderId')
            );
            if (!invError && businessInvoices) {
                let actualBusinessRevenue = 0;
                
                for (const inv of businessInvoices) {
                    if (inv.orderId && typeof inv.orderId === 'object' && 'items' in inv.orderId) {
                        const myBusinessId = businessIds.find(bid => 
                            inv.businessIds.some((invBid: any) => invBid.toString() === bid.toString())
                        );
                        if (myBusinessId) {
                            const order = inv.orderId as any;
                            const businessAmount = order.items
                                .filter((item: any) => item.businessId.toString() === myBusinessId.toString())
                                .reduce((sum: number, item: any) => sum + item.totalPriceOfItems, 0);
                            actualBusinessRevenue += businessAmount;
                        }
                    } else {
                        actualBusinessRevenue += (inv.amount - inv.platformFee);
                    }
                }
                
                const totalInvoiceAmount = businessInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                totalStats.totalRevenue = (totalStats.totalRevenue || 0) - totalInvoiceAmount + actualBusinessRevenue;
            }
        }

        return {
            totalRevenue: totalStats.totalRevenue || 0,
            totalPlatformFees: totalStats.totalPlatformFees || 0,
            averageTransaction: totalStats.averageTransaction || 0,
            totalTransactions: totalStats.totalTransactions || 0,
            revenueByStatus: result.byStatus || [],
            monthlyTrend: result.monthlyTrend || [],
            yearlyTrend: result.yearlyTrend || []
        };
    }
}