import User from '../models/user.model';
import Order from '../models/order.model';
import Booking from '../models/booking.model';
import Invoice from '../models/invoice.model';

/**
 * Service to fetch user statistics for the admin dashboard
 * Returns counts of crew users, distributors, and manufacturers
 */
export const getUserStats = async () => {
  try {
    // Count users by role
    const [crewCount, distributorCount, manufacturerCount, totalUsers] = await Promise.all([
      User.countDocuments({ role: 'user', isActive: true }),
      User.countDocuments({ role: 'distributor', isActive: true }),
      User.countDocuments({ role: 'manufacturer', isActive: true }),
      User.countDocuments({ isActive: true })
    ]);

    return {
      status: true,
      data: {
        crewUsers: crewCount,
        distributors: distributorCount,
        manufacturers: manufacturerCount,
        totalUsers: totalUsers
      }
    };
  } catch (error) {
    console.error('Error in getUserStats service:', error);
    throw new Error('Failed to fetch user statistics');
  }
};

/**
 * Service to fetch platform trends for orders, bookings, invoices, and user growth
 * @param {number} days - Number of days to look back (default: 30)
 */
export const getPlatformTrends = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate orders over time
    const ordersOverTime = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregate bookings over time
    const bookingsOverTime = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregate invoice status
    const invoiceStats = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Aggregate user growth over time
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    return {
      status: true,
      data: {
        orders: ordersOverTime.map((item: any) => ({
          date: item._id,
          count: item.count,
          totalAmount: item.totalAmount || 0
        })),
        bookings: bookingsOverTime.map((item: any) => ({
          date: item._id,
          count: item.count
        })),
        invoices: {
          paid: invoiceStats.find((s: any) => s._id === 'paid') || { count: 0, totalAmount: 0 },
          pending: invoiceStats.find((s: any) => s._id === 'pending') || { count: 0, totalAmount: 0 },
          failed: invoiceStats.find((s: any) => s._id === 'failed') || { count: 0, totalAmount: 0 }
        },
        userGrowth: userGrowth.map((item: any) => ({
          date: item._id.date,
          role: item._id.role,
          count: item.count
        }))
      }
    };
  } catch (error) {
    console.error('Error in getPlatformTrends service:', error);
    throw new Error('Failed to fetch platform trends');
  }
};

/**
 * Service to fetch leaderboards for top users and suppliers
 * Returns top 3 users with highest orders/bookings and top 3 suppliers
 */
export const getLeaderboards = async () => {
  try {
    // Top users by orders
    const topUsersByOrders = await Order.aggregate([
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' }
    ]);

    // Top users by bookings
    const topUsersByBookings = await Booking.aggregate([
      {
        $group: {
          _id: '$userId',
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { bookingCount: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' }
    ]);

    // Top suppliers (distributors) by products sold
    const topSuppliers = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$productInfo.userId',
          productsSold: { $sum: '$items.quantity' },
          revenue: {
            $sum: { $multiply: ['$items.quantity', '$items.price'] }
          }
        }
      },
      { $sort: { productsSold: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: '$supplierInfo' }
    ]);

    // Top service providers by bookings
    const topServiceProviders = await Booking.aggregate([
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      },
      { $unwind: '$serviceInfo' },
      {
        $group: {
          _id: '$serviceInfo.businessId',
          bookingsReceived: { $sum: 1 }
        }
      },
      { $sort: { bookingsReceived: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'businesses',
          localField: '_id',
          foreignField: '_id',
          as: 'businessInfo'
        }
      },
      { $unwind: '$businessInfo' }
    ]);

    return {
      status: true,
      data: {
        topUsers: {
          byOrders: topUsersByOrders.map((user: any) => ({
            userId: user._id,
            name: `${user.userInfo.firstName} ${user.userInfo.lastName}`,
            email: user.userInfo.email,
            orderCount: user.orderCount,
            totalSpent: user.totalSpent
          })),
          byBookings: topUsersByBookings.map((user: any) => ({
            userId: user._id,
            name: `${user.userInfo.firstName} ${user.userInfo.lastName}`,
            email: user.userInfo.email,
            bookingCount: user.bookingCount
          }))
        },
        topSuppliers: topSuppliers.map((supplier: any) => ({
          supplierId: supplier._id,
          name: supplier.supplierInfo.businessName || `${supplier.supplierInfo.firstName} ${supplier.supplierInfo.lastName}`,
          email: supplier.supplierInfo.email,
          productsSold: supplier.productsSold,
          revenue: supplier.revenue
        })),
        topServiceProviders: topServiceProviders.map((provider: any) => ({
          businessId: provider._id,
          businessName: provider.businessInfo.businessName,
          bookingsReceived: provider.bookingsReceived
        }))
      }
    };
  } catch (error) {
    console.error('Error in getLeaderboards service:', error);
    throw new Error('Failed to fetch leaderboards');
  }
};
