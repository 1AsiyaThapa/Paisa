'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Camera,
  Edit2,
  Loader2,
  Lock,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserCircle2,
  X,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { categoryService, userService } from '@/services/api';
import { Category, CategoryCreate } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IconPicker, ICON_MAP } from '@/components/ui/IconPicker';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { validatePassword } from '@/lib/utils';

function getInitials(name?: string) {
  if (!name) return 'PT';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, updateUserState, refreshUser } = useAuth();

  const [profileName, setProfileName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryFeedback, setCategoryFeedback] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<CategoryCreate>({
    name: '',
    type: 'expense',
    icon: 'Wallet',
    color: '#000000',
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(user?.name || '');
  }, [user?.name]);

  useEffect(() => {
    void loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setCategoryLoading(true);
      setCategoryError(null);
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Failed to load categories.');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileFeedback(null);

    try {
      const payload: { name?: string; password?: string; new_password?: string } = {};

      if (profileName.trim() && profileName.trim() !== user?.name) {
        payload.name = profileName.trim();
      }

      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword) {
          throw new Error('Enter your current password to set a new one.');
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
          throw new Error(passwordError);
        }

        if (newPassword !== confirmPassword) {
          throw new Error('New password and confirmation do not match.');
        }

        payload.password = currentPassword;
        payload.new_password = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setProfileFeedback('Nothing to update yet. Make a change and save again.');
        return;
      }

      const updatedUser = await userService.updateProfile(payload);
      updateUserState(updatedUser);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setProfileFeedback('Profile saved successfully.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update your profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setProfileError(null);
    setProfileFeedback(null);

    try {
      const updatedUser = await userService.uploadProfilePicture(file);
      updateUserState(updatedUser);
      setProfileFeedback('Profile picture updated.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to upload profile picture.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setCategoryError(null);
      setCategoryFeedback(null);
      await categoryService.createCategory(newCategory);
      setIsAddingCategory(false);
      setNewCategory({ name: '', type: 'expense', icon: 'Wallet', color: '#000000' });
      setCategoryFeedback('Category created.');
      await loadCategories();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Failed to create category.');
    }
  };

  const handleUpdateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      setCategoryError(null);
      setCategoryFeedback(null);
      await categoryService.updateCategory(editingCategory.id, {
        name: editingCategory.name,
        type: editingCategory.type,
        icon: editingCategory.icon,
        color: editingCategory.color,
      });
      setEditingCategory(null);
      setCategoryFeedback('Category updated.');
      await loadCategories();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Failed to update category.');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteId) return;

    try {
      setCategoryError(null);
      setCategoryFeedback(null);
      await categoryService.deleteCategory(deleteId);
      setCategoryFeedback('Category deleted.');
      await loadCategories();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Failed to delete category.');
    } finally {
      setDeleteId(null);
    }
  };

  const renderCategoryColumn = (type: 'income' | 'expense', title: string, tone: 'green' | 'red') => {
    const filteredCategories = categories.filter((category) => category.type === type);

    return (
      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-semibold ${tone === 'green' ? 'text-green-700' : 'text-red-700'}`}>{title}</h3>
              <p className="text-sm text-slate-500">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
              </p>
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="app-surface-muted p-6 text-center text-sm text-slate-500">
              No {type} categories yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCategories.map((category) => {
                const Icon = ICON_MAP[category.icon] || ICON_MAP.Wallet;
                const isEditing = editingCategory?.id === category.id;

                return (
                  <div key={category.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                    {isEditing ? (
                      <form onSubmit={handleUpdateCategory} className="space-y-3">
                        <Input
                          label="Category name"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        />
                        <IconPicker
                          selectedIcon={editingCategory.icon}
                          onSelect={(icon) => setEditingCategory({ ...editingCategory, icon })}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm">
                            <Save className="h-4 w-4" />
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-xl p-2 ${tone === 'green' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{category.name}</div>
                            <div className="text-xs text-slate-500">{category.icon}</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingCategory(category)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(category.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">Profile & Settings</h1>
          <p className="app-page-copy">Update your identity, account security, and the categories that power your reports.</p>
        </div>
      </div>

      {(profileFeedback || profileError) && (
        <div className={`rounded-xl px-4 py-3 text-sm ${profileError ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-green-200 bg-green-50 text-green-700'}`}>
          {profileError || profileFeedback}
        </div>
      )}

      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="relative">
              {user.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-3xl object-cover shadow-sm ring-4 ring-white"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 text-2xl font-semibold text-white shadow-sm">
                  {getInitials(user.name)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 rounded-full border border-white bg-white p-2 shadow-sm transition hover:bg-slate-50"
                disabled={uploadingImage}
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <Camera className="h-4 w-4 text-slate-600" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <div>
              <div className="text-2xl font-semibold text-slate-900">{user.name}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="app-chip">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {user.google_id ? 'Google-authenticated' : 'Password-protected'}
                </span>
                <span className="app-chip">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Personal details</h2>
              <p className="text-sm text-slate-500">Keep your profile name current. Your email stays read-only for account safety.</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Input
                label="Full name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              <Input
                label="Email address"
                value={user.email}
                disabled
              />

              {!user.google_id ? (
                <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div>
                    <h3 className="font-medium text-slate-900">Change password</h3>
                    <p className="text-sm text-slate-500">Leave these blank if you only want to update your name.</p>
                  </div>
                  <Input
                    label="Current password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700">
                  Password changes are managed through your Google account because you sign in with Google.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="h-4 w-4" />}
                  {profileLoading ? 'Saving changes...' : 'Save profile'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refreshUser()}
                >
                  <Upload className="h-4 w-4" />
                  Refresh profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Picture & access</h2>
              <p className="text-sm text-slate-500">A few quick actions for how your account appears across Paisatrack.</p>
            </div>

            <div className="app-surface-muted p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                  <Camera className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-slate-900">Profile picture</div>
                  <p className="text-sm text-slate-500">Upload a square or portrait image to personalize your account.</p>
                  <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                    {uploadingImage ? <LoadingSpinner size="sm" className="mr-2" /> : <Upload className="h-4 w-4" />}
                    {uploadingImage ? 'Uploading...' : 'Upload new picture'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="app-surface-muted p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Sign-in method</div>
                  <p className="mt-1 text-sm text-slate-500">
                    {user.google_id
                      ? 'Google login is active on this account.'
                      : 'Email and password login is active on this account.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Categories</h2>
            <p className="text-sm text-slate-500">Keep your income and expense categories clean so charts and reports stay useful.</p>
          </div>
          <Button onClick={() => setIsAddingCategory((current) => !current)}>
            <Plus className="h-4 w-4" />
            {isAddingCategory ? 'Close category form' : 'Add category'}
          </Button>
        </div>

        {(categoryFeedback || categoryError) && (
          <div className={`rounded-xl px-4 py-3 text-sm ${categoryError ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-green-200 bg-green-50 text-green-700'}`}>
            {categoryError || categoryFeedback}
          </div>
        )}

        {isAddingCategory && (
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Category name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    required
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Type</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200"
                      value={newCategory.type}
                      onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value as 'income' | 'expense' })}
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                </div>

                <IconPicker
                  selectedIcon={newCategory.icon}
                  onSelect={(icon) => setNewCategory({ ...newCategory, icon })}
                />

                <div className="flex gap-3">
                  <Button type="submit">Create category</Button>
                  <Button type="button" variant="ghost" onClick={() => setIsAddingCategory(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {categoryLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {renderCategoryColumn('income', 'Income Categories', 'green')}
            {renderCategoryColumn('expense', 'Expense Categories', 'red')}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message="Are you sure you want to delete this category? This may affect your reports and future transaction tagging."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
