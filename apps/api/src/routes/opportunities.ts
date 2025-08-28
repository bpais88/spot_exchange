import { Router } from 'express';
import { queries } from '@spot-exchange/database';
import { CreateOpportunitySchema, UpdateOpportunitySchema, OpportunityFiltersSchema } from '@spot-exchange/shared';
import { AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get all opportunities with filters
router.get('/', async (req: AuthRequest, res) => {
  try {
    const filters = OpportunityFiltersSchema.parse(req.query);
    
    // Add tenant filter
    const tenantFilters = {
      ...filters,
      tenantId: req.user!.tenantId,
    };

    const { data, error, count } = await queries.getOpportunities(tenantFilters);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch opportunities',
        },
      });
    }

    res.json({
      success: true,
      data,
      metadata: {
        total: count || 0,
        page: filters.page || 1,
        limit: filters.limit || 10,
      },
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch opportunities',
      },
    });
  }
});

// Get single opportunity by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await queries.getOpportunityById(id);

    if (error) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Opportunity not found',
        },
      });
    }

    // Check if user has access to this opportunity (tenant check is handled by RLS)
    if (data.tenant_id !== req.user!.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch opportunity',
      },
    });
  }
});

// Create new opportunity (account managers only)
router.post('/', requireRole('account_manager', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const opportunityData = CreateOpportunitySchema.parse(req.body);

    const { data, error } = await queries.createOpportunity({
      ...opportunityData,
      tenant_id: req.user!.tenantId,
      created_by: req.user!.id,
      status: 'draft',
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create opportunity',
        },
      });
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create opportunity',
      },
    });
  }
});

// Update opportunity
router.put('/:id', requireRole('account_manager', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = UpdateOpportunitySchema.parse(req.body);

    // First check if opportunity exists and belongs to user's tenant
    const { data: existingData, error: fetchError } = await queries.getOpportunityById(id);
    
    if (fetchError || !existingData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Opportunity not found',
        },
      });
    }

    if (existingData.tenant_id !== req.user!.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const { data, error } = await queries.updateOpportunity(id, updateData);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update opportunity',
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update opportunity',
      },
    });
  }
});

// Delete opportunity
router.delete('/:id', requireRole('account_manager', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // First check if opportunity exists and belongs to user's tenant
    const { data: existingData, error: fetchError } = await queries.getOpportunityById(id);
    
    if (fetchError || !existingData) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Opportunity not found',
        },
      });
    }

    if (existingData.tenant_id !== req.user!.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    // Update status to cancelled instead of hard delete
    const { data, error } = await queries.updateOpportunity(id, {
      status: 'cancelled',
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete opportunity',
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Opportunity deleted successfully' },
    });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete opportunity',
      },
    });
  }
});

// Get bids for an opportunity
router.get('/:id/bids', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // First verify user has access to the opportunity
    const { data: opportunity, error: oppError } = await queries.getOpportunityById(id);
    
    if (oppError || !opportunity) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Opportunity not found',
        },
      });
    }

    if (opportunity.tenant_id !== req.user!.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    const { data, error } = await queries.getBidsForOpportunity(id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to fetch bids',
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get opportunity bids error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch bids',
      },
    });
  }
});

export default router;