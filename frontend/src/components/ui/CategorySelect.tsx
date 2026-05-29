import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Category } from '@/types';
import { categoryService } from '@/services/api';
import { ICON_MAP } from './IconPicker';
import Link from 'next/link';

interface CategorySelectProps {
    value: string;
    onChange: (value: string) => void;
    type: 'income' | 'expense';
    placeholder?: string;
    className?: string;
}

export function CategorySelect({
    value,
    onChange,
    type,
    placeholder = "Select category",
    className
}: CategorySelectProps) {
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const allCategories = await categoryService.getCategories();
                setCategories(allCategories.filter(c => c.type === type));
            } catch (error) {
                console.error('Failed to fetch categories', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [type]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCategory = categories.find(c => c.name === value);
    const SelectedIcon = selectedCategory ? (ICON_MAP[selectedCategory.icon] || ICON_MAP['Wallet']) : null;

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
            </label>
            <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between font-normal"
                onClick={() => setOpen(!open)}
            >
                {value ? (
                    <div className="flex items-center gap-2">
                        {SelectedIcon && <SelectedIcon className="w-4 h-4 text-gray-500" />}
                        <span>{value}</span>
                    </div>
                ) : (
                    <span className="text-gray-500">{loading ? "Loading..." : placeholder}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg animate-in fade-in-0 zoom-in-95">
                    <div className="max-h-[200px] overflow-y-auto p-1">
                        {categories.length === 0 && !loading && (
                            <div className="p-2 text-sm text-gray-500 text-center">
                                No categories found.
                            </div>
                        )}

                        {categories.map((category) => {
                            const Icon = ICON_MAP[category.icon] || ICON_MAP['Wallet'];
                            const isSelected = category.name === value;

                            return (
                                <div
                                    key={category.id}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100",
                                        isSelected && "bg-gray-100"
                                    )}
                                    onClick={() => {
                                        onChange(category.name);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className={cn(
                                            "p-1 rounded-md",
                                            type === 'income' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                        )}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span>{category.name}</span>
                                    </div>
                                    {isSelected && (
                                        <Check className="ml-auto h-4 w-4 text-blue-600" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="border-t p-1">
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Manage Categories
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
