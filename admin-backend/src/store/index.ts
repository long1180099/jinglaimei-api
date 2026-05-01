import { configureStore, isRejected } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import productReducer from './slices/productSlice';
import orderReducer from './slices/orderSlice';
import commissionReducer from './slices/commissionSlice';
import teamReducer from './slices/teamSlice';
import schoolReducer from './slices/schoolSlice';

// 错误诊断中间件 - 捕获所有Redux错误并输出详细信息
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorDiagnostics: any = (storeApi: any) => (next: any) => (action: any) => {
  try {
    const result = next(action);
    if (isRejected(action)) {
      console.error('[Redux 诊断] Rejected Action:', {
        type: action.type,
        payload: action.payload,
        error: (action as any).error?.message || '未知错误',
      });
    }
    return result;
  } catch (err: any) {
    console.error('[Redux 诊断] Reducer异常:', {
      actionType: action.type,
      actionPayload: action.payload,
      errorMessage: err.message,
      errorStack: err.stack,
    });
    throw err;
  }
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    product: productReducer,
    order: orderReducer,
    commission: commissionReducer,
    team: teamReducer,
    school: schoolReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/logout'],
        ignoredPaths: ['auth.user'],
      },
    }).concat(errorDiagnostics),
});

// 导出类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;