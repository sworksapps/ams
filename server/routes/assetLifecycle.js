const express = require('express');
const router = express.Router();
const ExternalTicketing = require('../utils/externalTicketing');

// Get comprehensive asset lifecycle data by asset ID
router.get('/asset/:assetId/lifecycle', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    console.log(`🔄 Fetching lifecycle data for asset: ${assetId}`);
    
    // Fetch all ticket types for this asset using bmsticketslist API
    const [ppmTasks, amcRenewals, repairTickets] = await Promise.allSettled([
      // PPM Tasks
      ExternalTicketing.fetchTickets({
        type: 'PPM',
        assetId: assetId,
        limit: 50
      }),
      // AMC Renewals
      ExternalTicketing.fetchTickets({
        type: 'AMC',
        assetId: assetId,
        limit: 50
      }),
      // Repair/Maintenance Tickets
      ExternalTicketing.fetchTickets({
        type: 'REPAIR',
        assetId: assetId,
        limit: 50
      })
    ]);

    // Process results and handle any failures
    const lifecycleData = {
      assetId,
      ppmTasks: {
        data: ppmTasks.status === 'fulfilled' ? ppmTasks.value.data || [] : [],
        error: ppmTasks.status === 'rejected' ? ppmTasks.reason.message : null
      },
      amcRenewals: {
        data: amcRenewals.status === 'fulfilled' ? amcRenewals.value.data || [] : [],
        error: amcRenewals.status === 'rejected' ? amcRenewals.reason.message : null
      },
      repairTickets: {
        data: repairTickets.status === 'fulfilled' ? repairTickets.value.data || [] : [],
        error: repairTickets.status === 'rejected' ? repairTickets.reason.message : null
      }
    };

    // Calculate KPIs
    const kpis = calculateAssetKPIs(lifecycleData);
    
    console.log(`✅ Asset lifecycle data fetched successfully for ${assetId}:`, {
      ppmCount: lifecycleData.ppmTasks.data.length,
      amcCount: lifecycleData.amcRenewals.data.length,
      repairCount: lifecycleData.repairTickets.data.length
    });

    res.json({
      success: true,
      data: {
        ...lifecycleData,
        kpis
      }
    });

  } catch (error) {
    console.error('❌ Error fetching asset lifecycle data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset lifecycle data',
      error: error.message
    });
  }
});

// Get asset lifecycle summary for dashboard
router.get('/summary', async (req, res) => {
  try {
    console.log('🔄 Fetching asset lifecycle summary for dashboard');
    
    // Fetch overall KPIs from external ticketing system
    const [overallKPIs, recentActivity] = await Promise.allSettled([
      ExternalTicketing.fetchKPIs(),
      ExternalTicketing.fetchTickets({
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
    ]);

    const summaryData = {
      overallKPIs: overallKPIs.status === 'fulfilled' ? overallKPIs.value : {},
      recentActivity: recentActivity.status === 'fulfilled' ? recentActivity.value.data || [] : [],
      errors: {
        kpis: overallKPIs.status === 'rejected' ? overallKPIs.reason.message : null,
        activity: recentActivity.status === 'rejected' ? recentActivity.reason.message : null
      }
    };

    console.log('✅ Asset lifecycle summary fetched successfully');

    res.json({
      success: true,
      data: summaryData
    });

  } catch (error) {
    console.error('❌ Error fetching asset lifecycle summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset lifecycle summary',
      error: error.message
    });
  }
});

// Get asset-centric dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    console.log('🔄 Fetching asset-centric dashboard data');
    
    // Fetch comprehensive dashboard data
    const [
      assetsByStatus,
      criticalAssets,
      upcomingMaintenance,
      performanceMetrics
    ] = await Promise.allSettled([
      // Assets grouped by operational status
      ExternalTicketing.fetchTickets({
        type: 'ALL',
        groupBy: 'status',
        limit: 100
      }),
      // Critical assets needing attention
      ExternalTicketing.fetchTickets({
        type: 'ALL',
        priority: 'critical',
        limit: 20
      }),
      // Upcoming maintenance activities
      ExternalTicketing.fetchTickets({
        type: 'PPM',
        status: 'scheduled',
        limit: 15
      }),
      // Performance metrics
      ExternalTicketing.fetchKPIs()
    ]);

    const dashboardData = {
      assetsByStatus: assetsByStatus.status === 'fulfilled' ? assetsByStatus.value : {},
      criticalAssets: criticalAssets.status === 'fulfilled' ? criticalAssets.value.data || [] : [],
      upcomingMaintenance: upcomingMaintenance.status === 'fulfilled' ? upcomingMaintenance.value.data || [] : [],
      performanceMetrics: performanceMetrics.status === 'fulfilled' ? performanceMetrics.value : {},
      errors: {
        assetsByStatus: assetsByStatus.status === 'rejected' ? assetsByStatus.reason.message : null,
        criticalAssets: criticalAssets.status === 'rejected' ? criticalAssets.reason.message : null,
        upcomingMaintenance: upcomingMaintenance.status === 'rejected' ? upcomingMaintenance.reason.message : null,
        performanceMetrics: performanceMetrics.status === 'rejected' ? performanceMetrics.reason.message : null
      }
    };

    console.log('✅ Asset-centric dashboard data fetched successfully');

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Error fetching asset-centric dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset-centric dashboard data',
      error: error.message
    });
  }
});

// Helper function to calculate asset KPIs
function calculateAssetKPIs(lifecycleData) {
  const { ppmTasks, amcRenewals, repairTickets } = lifecycleData;
  
  // Calculate PPM KPIs
  const ppmKPIs = {
    total: ppmTasks.data.length,
    completed: ppmTasks.data.filter(task => task.status === 'completed').length,
    pending: ppmTasks.data.filter(task => task.status === 'pending' || task.status === 'open').length,
    overdue: ppmTasks.data.filter(task => task.status === 'overdue').length
  };

  // Calculate AMC KPIs
  const amcKPIs = {
    total: amcRenewals.data.length,
    active: amcRenewals.data.filter(amc => amc.status === 'active').length,
    expiring: amcRenewals.data.filter(amc => amc.status === 'expiring').length,
    expired: amcRenewals.data.filter(amc => amc.status === 'expired').length
  };

  // Calculate Repair KPIs
  const repairKPIs = {
    total: repairTickets.data.length,
    open: repairTickets.data.filter(ticket => ticket.status === 'open').length,
    inProgress: repairTickets.data.filter(ticket => ticket.status === 'in_progress').length,
    closed: repairTickets.data.filter(ticket => ticket.status === 'closed').length
  };

  // Overall asset health score (0-100)
  const totalTasks = ppmKPIs.total + amcKPIs.total + repairKPIs.total;
  const completedTasks = ppmKPIs.completed + amcKPIs.active + repairKPIs.closed;
  const healthScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  return {
    ppm: ppmKPIs,
    amc: amcKPIs,
    repairs: repairKPIs,
    healthScore,
    totalActivities: totalTasks,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = router;
