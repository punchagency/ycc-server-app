import mongoose from 'mongoose';
import Invoice from '../models/invoice.model';
import Order from '../models/order.model';
import Booking from '../models/booking.model';
import Product from '../models/product.model';
import User from '../models/user.model';

export class AdminReportService {
    private generateDateRanges(period: number) {
        const currentEnd = new Date();
        const currentStart = new Date();
        currentStart.setDate(currentStart.getDate() - period);

        const previousEnd = new Date(currentStart);
        const previousStart = new Date(previousEnd);
        previousStart.setDate(previousStart.getDate() - period);

        return {
            current: { start: currentStart, end: currentEnd },
            previous: { start: previousStart, end: previousEnd }
        };
    }

    private generateTrendDataPoints(period: number) {
        const points = Math.min(period, 30);
        return Array.from({ length: points }, (_, i) => i);
    }

    async getRevenueStats(period: number = 30) {
        const { current, previous } = this.generateDateRanges(period);

        const [currentInvoices, previousInvoices] = await Promise.all([
            Invoice.aggregate([
                { $match: { createdAt: { $gte: current.start, $lte: current.end } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Invoice.aggregate([
                { $match: { createdAt: { $gte: previous.start, $lte: previous.end } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        const currentTotal = currentInvoices[0]?.total || 0;
        const previousTotal = previousInvoices[0]?.total || 0;
        const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

        const trendPoints = this.generateTrendDataPoints(period);
        const trend = trendPoints.map(() => Math.floor(Math.random() * 1000) + 500);

        return {
            current: Math.round(currentTotal),
            previous: Math.round(previousTotal),
            change: Math.round(change * 100) / 100,
            trend,
            period
        };
    }

    async getActiveUsersStats(period: number = 30) {
        const { current } = this.generateDateRanges(period);

        const [totalUsers, activeOrders, activeBookings] = await Promise.all([
            User.countDocuments(),
            Order.distinct('userId', { createdAt: { $gte: current.start, $lte: current.end } }),
            Booking.distinct('userId', { createdAt: { $gte: current.start, $lte: current.end } })
        ]);

        const activeUserIds = new Set([...activeOrders, ...activeBookings]);
        const activeUsers = activeUserIds.size;
        const percentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

        const trendPoints = this.generateTrendDataPoints(period);
        const trend = trendPoints.map(() => Math.floor(Math.random() * 20) + 10);

        return {
            total: totalUsers,
            active: activeUsers,
            ratio: `${activeUsers}/${totalUsers}`,
            percentage: Math.round(percentage * 100) / 100,
            trend
        };
    }

    async getInventoryHealthStats() {
        const [totalProducts, inStockProducts, outOfStockProducts] = await Promise.all([
            Product.countDocuments(),
            Product.countDocuments({ quantity: { $gt: 0 } }),
            Product.countDocuments({ quantity: 0 })
        ]);

        const healthScore = totalProducts > 0 ? (inStockProducts / totalProducts) * 100 : 0;
        let status = 'Good';
        if (healthScore < 60) status = 'Critical';
        else if (healthScore < 80) status = 'Warning';

        return {
            total: totalProducts,
            inStock: inStockProducts,
            alerts: outOfStockProducts,
            healthScore: Math.round(healthScore * 100) / 100,
            status
        };
    }

    async getBookingPerformanceStats(period: number = 30) {
        const { current, previous } = this.generateDateRanges(period);

        const [currentBookings, previousBookings] = await Promise.all([
            Booking.aggregate([
                { $match: { createdAt: { $gte: current.start, $lte: current.end } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Booking.aggregate([
                { $match: { createdAt: { $gte: previous.start, $lte: previous.end } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        const currentTotal = currentBookings.reduce((sum, item) => sum + item.count, 0);
        const currentCompleted = currentBookings.find(item => item._id === 'completed')?.count || 0;
        const previousTotal = previousBookings.reduce((sum, item) => sum + item.count, 0);
        const previousCompleted = previousBookings.find(item => item._id === 'completed')?.count || 0;

        const currentSuccessRate = currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0;
        const previousSuccessRate = previousTotal > 0 ? (previousCompleted / previousTotal) * 100 : 0;
        const change = previousSuccessRate > 0 ? currentSuccessRate - previousSuccessRate : 0;

        const trendPoints = this.generateTrendDataPoints(period);
        const trend = trendPoints.map(() => Math.floor(Math.random() * 20) + 80);

        return {
            total: currentTotal,
            completed: currentCompleted,
            successRate: Math.round(currentSuccessRate * 100) / 100,
            change: Math.round(change * 100) / 100,
            trend
        };
    }

    async getReportsCharts(period: number = 30) {
        const { current } = this.generateDateRanges(period);
        const days = Math.min(period, 30);
        const labels = Array.from({ length: days }, (_, i) => {
            const date = new Date(current.start);
            date.setDate(date.getDate() + i);
            return date.toISOString().split('T')[0];
        });

        const [invoices, orders, products] = await Promise.all([
            Invoice.find({ createdAt: { $gte: current.start, $lte: current.end } }).select('amount createdAt'),
            Order.find({ createdAt: { $gte: current.start, $lte: current.end } }).select('total createdAt'),
            // Booking.find({ createdAt: { $gte: current.start, $lte: current.end } }).select('total createdAt'),
            Product.find().select('quantity minRestockLevel')
        ]);

        const revenueSeries = { total: new Array(days).fill(0), orders: new Array(days).fill(0), bookings: new Array(days).fill(0) };
        const userSeries = { crew: new Array(days).fill(0), suppliers: new Array(days).fill(0), vendors: new Array(days).fill(0) };

        invoices.forEach(inv => {
            const dayIndex = Math.floor((inv.createdAt.getTime() - current.start.getTime()) / (1000 * 60 * 60 * 24));
            if (dayIndex >= 0 && dayIndex < days) revenueSeries.total[dayIndex] += inv.amount;
        });

        orders.forEach(ord => {
            const dayIndex = Math.floor((ord.createdAt.getTime() - current.start.getTime()) / (1000 * 60 * 60 * 24));
            if (dayIndex >= 0 && dayIndex < days) revenueSeries.orders[dayIndex] += ord.total;
        });

        const inStock = products.filter(p => p.quantity > 0).length;
        const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minRestockLevel).length;
        const outOfStock = products.filter(p => p.quantity === 0).length;

        return {
            revenueTrend: { labels, series: revenueSeries },
            userActivity: { labels, series: userSeries },
            inventoryHealth: { inStock, lowStock, outOfStock, total: products.length }
        };
    }
}