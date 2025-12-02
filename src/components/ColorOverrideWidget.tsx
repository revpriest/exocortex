/**
 * ColorOverrideWidget.tsx - Category Color Override Management
 *
 * This component allows users to override the default color calculation
 * for specific event categories. Users can:
 *
 * - Select categories from existing ones or type new ones
 * - Adjust hue (0-360) with a color slider
 * - See live color preview
 * - Add/remove multiple overrides
 * - Categories persist in app preferences
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { ColorOverride } from '@/contexts/AppContext';
import { ExocortexDB } from '@/lib/exocortex';

/**
 * ColorOverrideItem Component
 *
 * Represents a single color override with its controls.
 * Each item shows color preview, category edit, hue slider, and delete button.
 */
interface ColorOverrideItemProps {
  override: ColorOverride;
  onUpdate: (override: ColorOverride) => void;
  onDelete: () => void;
  availableCategories: string[];
}

const ColorOverrideItem: React.FC<ColorOverrideItemProps> = ({
  override,
  onUpdate,
  onDelete,
  availableCategories
}) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [editCategory, setEditCategory] = useState(override.category);

  const handleCategoryChange = (newCategory: string) => {
    setEditCategory(newCategory);
    setShowCategoryDropdown(false);
    onUpdate({ ...override, category: newCategory });
  };

  const handleHueChange = (hue: number[]) => {
    onUpdate({ ...override, hue: hue[0] });
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
      {/* Color Preview */}
      <div className="flex-shrink-0">
        <div
          className="w-12 h-12 rounded-full border-2 border-border shadow-sm"
          style={{ backgroundColor: `hsl(${override.hue}, 70%, 50%)` }}
        />
      </div>

      {/* Category Input */}
      <div className="flex-1 relative">
        <Label className="text-sm text-muted-foreground mb-1 block">Category</Label>
        <div className="relative">
          <Input
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            onBlur={() => handleCategoryChange(editCategory)}
            placeholder="Category name"
            className="pr-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setShowCategoryDropdown(!showCategoryDropdown);
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Category Dropdown */}
          {showCategoryDropdown && availableCategories.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {availableCategories.map((cat, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hue Slider */}
      <div className="flex-1">
        <Label className="text-sm text-muted-foreground mb-1 block">
          Hue: {override.hue}°
        </Label>
        <Slider
          value={[override.hue]}
          onValueChange={handleHueChange}
          max={360}
          min={0}
          step={1}
          className="w-full"
          style={{
            background: `linear-gradient(to right,
              hsl(0, 70%, 50%),
              hsl(60, 70%, 50%),
              hsl(120, 70%, 50%),
              hsl(180, 70%, 50%),
              hsl(240, 70%, 50%),
              hsl(300, 70%, 50%),
              hsl(360, 70%, 50%))`
          }}
        />
      </div>

      {/* Delete Button */}
      <div className="flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

/**
 * ColorOverrideWidget Component
 *
 * Main widget for managing all category color overrides.
 * Includes add button and lists all existing overrides.
 */
export const ColorOverrideWidget: React.FC = () => {
  const { config, updateConfig } = useAppContext();
  const [overrides, setOverrides] = useState<ColorOverride[]>(config.colorOverrides || []);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Load existing categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const db = new ExocortexDB();
        await db.init();

        // Get categories from last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);

        const days = await db.getEventsByDateRangeOnly(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        const categories = days.flatMap(day =>
          day.events.map(event => event.category)
        );

        // Get unique categories and add some defaults
        const uniqueCategories = [...new Set(categories)];
        const defaultCategories = ['Work', 'Sleep', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];
        const allCategories = [...new Set([...uniqueCategories, ...defaultCategories])];

        setAvailableCategories(Array.from(allCategories));
      } catch (error) {
        console.error('Failed to load categories:', error);
        setAvailableCategories(['Work', 'Sleep', 'Exercise', 'Meal', 'Break', 'Study', 'Slack']);
      }
    };

    loadCategories();
  }, []);

  // Sync overrides with app config
  useEffect(() => {
    setOverrides(config.colorOverrides || []);
  }, [config.colorOverrides]);

  // Close add dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdownContainer = target.closest('.relative');
      if (!dropdownContainer || !dropdownContainer.contains(target)) {
        setShowAddDropdown(false);
      }
    };

    if (showAddDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddDropdown]);

  const addOverride = () => {
    const category = newCategory.trim() || 'New Category';
    const newOverride: ColorOverride = {
      category,
      hue: Math.floor(Math.random() * 360) // Random starting hue
    };

    const updatedOverrides = [...overrides, newOverride];
    updateConfig((currentConfig) => ({
      ...currentConfig,
      colorOverrides: updatedOverrides,
    }));
    setNewCategory('');
  };

  const updateOverride = (index: number, override: ColorOverride) => {
    const updatedOverrides = [...overrides];
    updatedOverrides[index] = override;
    updateConfig((currentConfig) => ({
      ...currentConfig,
      colorOverrides: updatedOverrides,
    }));
  };

  const deleteOverride = (index: number) => {
    const updatedOverrides = overrides.filter((_, i) => i !== index);
    updateConfig((currentConfig) => ({
      ...currentConfig,
      colorOverrides: updatedOverrides,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Category Colors</h3>
          <p className="text-sm text-muted-foreground">Customize colors for specific categories</p>
        </div>
      </div>

      {/* Add New Override */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onBlur={() => {
              if (newCategory.trim()) {
                setShowAddDropdown(false);
              }
            }}
            placeholder="Category name (e.g., Work)"
            className="pr-8"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOverride();
              }
            }}
            onFocus={() => setShowAddDropdown(true)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAddDropdown(!showAddDropdown);
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Add Category Dropdown */}
          {showAddDropdown && availableCategories.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {availableCategories.map((cat, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setNewCategory(cat);
                    setShowAddDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={addOverride} className="px-4">
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {/* List of Overrides */}
      {overrides.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No color overrides yet</p>
          <p className="text-sm">Add a category above to customize its color</p>
        </div>
      ) : (
        <div className="space-y-3">
          {overrides.map((override, index) => (
            <ColorOverrideItem
              key={index}
              override={override}
              onUpdate={(updatedOverride) => updateOverride(index, updatedOverride)}
              onDelete={() => deleteOverride(index)}
              availableCategories={availableCategories.filter(cat =>
                !overrides.some(o => o.category === cat && o.category !== override.category)
              )}
            />
          ))}
        </div>
      )}


    </div>
  );
};
