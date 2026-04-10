import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public auth routes — redirect to app if already logged in
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
    canActivate: [guestGuard],
  },

  // Protected app shell with tab navigation
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    canActivate: [authGuard],
    children: [
      {
        path: 'discover',
        loadComponent: () => import('./pages/discover/discover.page').then((m) => m.DiscoverPage),
      },
      {
        path: 'friends',
        loadComponent: () => import('./pages/friends-list/friends-list.page').then((m) => m.FriendsListPage),
      },
      {
        path: 'chats',
        loadComponent: () => import('./pages/chat-list/chat-list.page').then((m) => m.ChatListPage),
      },
      {
        path: 'chat/:id',
        loadComponent: () => import('./pages/chat-room/chat-room.page').then((m) => m.ChatRoomPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      { path: '', redirectTo: 'discover', pathMatch: 'full' },
    ],
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
