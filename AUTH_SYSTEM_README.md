# Authentication System Documentation

## Overview

This document describes the refactored authentication system for the ClassRoom application. The system has been completely redesigned to address session persistence issues, improve security, and provide better user experience.

## Architecture

### Core Components

1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Central authentication state management
   - Handles both teacher (Supabase Auth) and student (custom) authentication
   - Provides unified interface for all auth operations

2. **useAuth Hook** (`src/hooks/useAuth.ts`)
   - Clean interface to AuthContext
   - Provides computed properties like `isAuthenticated`, `isTeacher`, `isStudent`
   - Type-safe authentication methods

3. **PrivateRoute Component** (`src/components/PrivateRoute.tsx`)
   - Route protection with role-based access control
   - Automatic redirects for unauthorized access
   - Stores attempted paths for post-login redirect

4. **RouteProvider** (`src/components/RouteProvider.tsx`)
   - Manages route remounting after auth state changes
   - Ensures clean component initialization
   - Prevents stale data issues

### Utility Modules

1. **AuthStorage** (`src/utils/authStorage.ts`)
   - Centralized storage management
   - Handles localStorage/sessionStorage with mobile compatibility
   - Comprehensive cleanup on logout

2. **AxiosConfig** (`src/utils/axiosConfig.ts`)
   - HTTP client with authentication interceptors
   - Auto-logout on 401 responses
   - Automatic token handling

3. **AuthHelpers** (`src/utils/authHelpers.ts`)
   - Validation functions
   - User data transformation
   - Security utilities

4. **RouteHelpers** (`src/utils/routeHelpers.ts`)
   - Route configuration and validation
   - Navigation utilities
   - Breadcrumb generation

## Key Features

### 1. Session Persistence Fix

**Problem**: User state was not properly reset after logout, causing stale data issues.

**Solution**:
- Comprehensive storage cleanup using `clearAuthStorage()`
- Immediate state reset in AuthContext
- Proper Supabase session termination

```typescript
const signOut = async () => {
  // Clear all authentication storage
  clearAuthStorage();
  
  // Clear all auth state immediately
  setUser(null);
  setProfile(null);
  setStudentAuth(null);
  setStudentProfile(null);
  setSession(null);
  setLoading(false);

  // Sign out from Supabase (for teachers)
  if (session) {
    await supabase.auth.signOut();
  }
};
```

### 2. Route Remounting

**Problem**: Components retained stale data after authentication changes.

**Solution**:
- RouteProvider generates unique keys for route trees
- Components remount when auth state changes
- Clean initialization prevents data leakage

```typescript
// Route key changes when auth state changes
const routeKey = user && profile 
  ? `${profile.role}-${user.id}-${Date.now()}` 
  : `unauthenticated-${Date.now()}`;
```

### 3. Auto-Logout on 401

**Problem**: No automatic logout when tokens expired.

**Solution**:
- Axios response interceptor detects 401 responses
- Automatic cleanup and redirect to login
- Prevents unauthorized API calls

```typescript
if (error.response?.status === 401 && !originalRequest._retry) {
  clearAuthStorage();
  await supabase.auth.signOut();
  window.location.href = '/';
}
```

### 4. Safe Redirect Flow

**Problem**: Users were redirected to dashboard instead of their intended page.

**Solution**:
- PrivateRoute stores attempted paths
- AuthForm checks for stored redirect paths
- Seamless navigation after login

```typescript
// Store attempted path
useEffect(() => {
  if (!isAuthenticated && location.pathname !== '/') {
    storeRedirectPath(location.pathname);
  }
}, [isAuthenticated, location.pathname]);

// Use stored path after login
const redirectPath = getAndClearRedirectPath();
const finalPath = redirectPath || dashboardPath;
```

## Usage Examples

### Basic Authentication Check

```typescript
import { useAuth } from '../hooks/useAuth';

const MyComponent = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  return (
    <div>
      <p>Welcome, {user?.full_name}!</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
};
```

### Protected Route

```typescript
import PrivateRoute, { UserRole } from '../components/PrivateRoute';

<PrivateRoute requiredRole={UserRole.Teacher}>
  <TeacherDashboard />
</PrivateRoute>
```

### HTTP Requests with Auto-Auth

```typescript
import axiosInstance from '../utils/axiosConfig';

// Automatically includes auth headers and handles 401s
const response = await axiosInstance.get('/api/data');
```

## Security Features

### 1. Comprehensive Storage Cleanup

- Clears all localStorage/sessionStorage items
- Removes Supabase-specific keys
- Handles mobile storage limitations

### 2. Token Management

- Automatic token refresh via Supabase
- Secure token storage
- Proper token cleanup on logout

### 3. Input Validation

- Email format validation
- Password strength requirements
- Input sanitization

### 4. Role-Based Access Control

- Route-level protection
- Component-level role checks
- Automatic redirects for unauthorized access

## Mobile Compatibility

The system includes mobile-specific optimizations:

- Safe localStorage operations with error handling
- Touch-friendly UI components
- Responsive design considerations
- Mobile storage limitations handling

## Error Handling

Comprehensive error handling throughout the system:

- Network error recovery
- Storage error handling
- Authentication failure management
- User-friendly error messages

## Performance Optimizations

- Lazy loading of components
- Memoized route components
- Efficient state updates
- Minimal re-renders

## Testing Considerations

The modular architecture makes testing easier:

- Separated concerns for unit testing
- Mockable dependencies
- Clear interfaces
- Isolated utility functions

## Migration Guide

### From Old System

1. Replace `ProtectedRoute` imports with `PrivateRoute`
2. Update `useAuth` imports to use the new hook
3. Remove manual localStorage management
4. Update route configurations

### Breaking Changes

- `ProtectedRoute` renamed to `PrivateRoute`
- AuthContext interface slightly changed
- Storage keys standardized
- Route structure updated

## Troubleshooting

### Common Issues

1. **Stale Data After Logout**
   - Ensure `clearAuthStorage()` is called
   - Check RouteProvider is wrapping routes
   - Verify state is properly reset

2. **401 Errors Not Handled**
   - Ensure axios interceptor is configured
   - Check token refresh logic
   - Verify Supabase client configuration

3. **Redirect Issues**
   - Check redirect path storage
   - Verify route configuration
   - Ensure proper role checking

### Debug Tools

- Auth state logging via `storeAuthState()`
- Console logging for auth events
- Route key tracking
- Storage state monitoring

## Future Enhancements

1. **Multi-Factor Authentication**
   - SMS/Email verification
   - TOTP support
   - Backup codes

2. **Session Management**
   - Concurrent session limits
   - Session timeout warnings
   - Device management

3. **Advanced Security**
   - Rate limiting
   - IP-based restrictions
   - Audit logging

4. **Performance**
   - Service worker caching
   - Offline support
   - Background sync

## Conclusion

The refactored authentication system provides a robust, secure, and user-friendly foundation for the ClassRoom application. The modular architecture ensures maintainability while the comprehensive error handling and mobile compatibility provide a smooth user experience across all devices.
