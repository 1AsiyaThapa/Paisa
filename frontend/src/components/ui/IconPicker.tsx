import { useState } from 'react';
import {
    Wallet, CreditCard, Banknote, PiggyBank, Briefcase,
    ShoppingBag, ShoppingCart, Utensils, Coffee, Car,
    Plane, Home, Zap, Wifi, Phone, Gift, Heart,
    Music, Book, GraduationCap, Dumbbell, Stethoscope,
    Film, Gamepad, Laptop, Smartphone, Camera,
    X, CircleOff
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '@/lib/utils';

export const ICON_MAP: Record<string, LucideIcon> = {
    None: CircleOff,
    Wallet, CreditCard, Banknote, PiggyBank, Briefcase,
    ShoppingBag, ShoppingCart, Utensils, Coffee, Car,
    Plane, Home, Zap, Wifi, Phone, Gift, Heart,
    Music, Book, GraduationCap, Dumbbell, Stethoscope,
    Film, Gamepad, Laptop, Smartphone, Camera
};

interface IconPickerProps {
    selectedIcon: string;
    onSelect: (iconName: string) => void;
    className?: string;
}

export function IconPicker({ selectedIcon, onSelect, className }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredIcons = Object.keys(ICON_MAP).filter(name =>
        name.toLowerCase().includes(search.toLowerCase())
    );

    const SelectedIconComponent = ICON_MAP[selectedIcon] || Wallet;

    return (
        <div className={cn("relative", className)}>
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full justify-between"
            >
                <div className="flex items-center gap-2">
                    <SelectedIconComponent className="w-5 h-5" />
                    <span>{selectedIcon || 'Select Icon'}</span>
                </div>
            </Button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full min-w-[300px] bg-white rounded-lg shadow-xl border p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Select Icon</h3>
                        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <Input
                        placeholder="Search icons..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mb-4"
                    />

                    <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto">
                        {filteredIcons.map((name) => {
                            const Icon = ICON_MAP[name];
                            return (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => {
                                        onSelect(name);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "p-2 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors",
                                        selectedIcon === name && "bg-blue-50 text-blue-600 ring-2 ring-blue-200"
                                    )}
                                    title={name}
                                >
                                    <Icon className="w-6 h-6" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
