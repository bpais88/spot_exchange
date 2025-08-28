import { Router } from 'express';
import { getSupabaseClient } from '@spot-exchange/database';
import { LoginSchema, RegisterSchema } from '@spot-exchange/shared';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Login failed',
      },
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const userData = RegisterSchema.parse(req.body);

    const supabase = getSupabaseClient();
    
    // First, create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          company_name: userData.companyName,
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
      },
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: authError.message,
        },
      });
    }

    // Then create the user in our users table (handled by database trigger)
    if (authData.user) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          tenant_id: userData.tenantId || '', // Will need to be set properly
          role: 'carrier' as const,
          company_name: userData.companyName,
          profile: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
          },
        });

      if (userError) {
        console.error('User creation error:', userError);
        // We might want to clean up the auth user here
      }
    }

    res.json({
      success: true,
      data: {
        user: authData.user,
        session: authData.session,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Registration failed',
      },
    });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get user data',
      },
    });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: error.message,
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Logout failed',
      },
    });
  }
});

export default router;