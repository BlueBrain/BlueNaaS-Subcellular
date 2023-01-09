import axios, { AxiosRequestConfig } from 'axios'
import storage from '@/services/storage'
import { User } from '@/types'

import { PUBLIC_USER_ID } from '@/constants'

const API_URL = 'http://localhost:8001'
// const API_URL = 'https://subcellular-rest-bsp-epfl.apps.hbp.eu'

export async function get<T>(endpoint: string, params = {}) {
  console.log('getting')
  const user = await storage.getItem<User>('user')
  try {
    return await axios.get<T>(`${API_URL}/${endpoint}`, { params: { user_id: user?.id, ...params } })
  } catch (e) {
    if (e.code === 400) return undefined
  }
}

export async function post<T>(endpoint: string, data: any, config?: AxiosRequestConfig<any>) {
  const user = await storage.getItem<User>('user')
  if (!data.user_id) data.user_id = user?.id
  try {
    return await axios.post<T>(`${API_URL}/${endpoint}`, data, config)
  } catch (e) {
    return e
  }
}

export async function patch<T>(endpoint: string, data: {}) {
  const user = await storage.getItem<User>('user')
  try {
    return await axios.patch<T>(`${API_URL}/${endpoint}`, { ...data, user_id: user?.id })
  } catch {
    return
  }
}

export async function del<T>(endpoint: string) {
  const user = await storage.getItem<User>('user')
  try {
    return await axios.delete<T>(`${API_URL}/${endpoint}`, { params: { user_id: user?.id } })
  } catch (e) {
    return
  }
}

export const getPublicModels = async <T>() =>
  await axios.get<T>(`${API_URL}/models`, { params: { user_id: PUBLIC_USER_ID } })
