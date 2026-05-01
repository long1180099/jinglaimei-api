/**
 * Redux hooks
 * 提供类型安全的useDispatch和useSelector
 */

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// 在整个应用中使用这些hook，而不是直接使用`useDispatch`和`useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;