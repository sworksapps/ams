const express = require('express');
const db = require('../database');

const router = express.Router();

// Get all categories (parent categories only)
router.get('/', async (req, res) => {
  try {
    const categories = await db.all(`
      SELECT id, name 
      FROM categories 
      WHERE parent_id IS NULL 
      ORDER BY name ASC
    `);
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get subcategories for a specific category
router.get('/:categoryId/subcategories', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const subcategories = await db.all(`
      SELECT id, name 
      FROM categories 
      WHERE parent_id = ? 
      ORDER BY name ASC
    `, [categoryId]);
    
    res.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
});

// Get subcategories by category name (for easier frontend integration)
router.get('/by-name/:categoryName/subcategories', async (req, res) => {
  try {
    const { categoryName } = req.params;
    
    // First get the category ID
    const category = await db.get(`
      SELECT id 
      FROM categories 
      WHERE name = ? AND parent_id IS NULL
    `, [categoryName]);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Then get subcategories
    const subcategories = await db.all(`
      SELECT id, name 
      FROM categories 
      WHERE parent_id = ? 
      ORDER BY name ASC
    `, [category.id]);
    
    res.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories by category name:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
});

// Get all categories with their subcategories (hierarchical structure)
router.get('/hierarchical', async (req, res) => {
  try {
    // Get all categories
    const allCategories = await db.all(`
      SELECT id, name, parent_id 
      FROM categories 
      ORDER BY parent_id IS NULL DESC, name ASC
    `);
    
    // Build hierarchical structure
    const categoryMap = new Map();
    const rootCategories = [];
    
    // First pass: create all category objects
    allCategories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id,
        subcategories: []
      });
    });
    
    // Second pass: build hierarchy
    allCategories.forEach(cat => {
      const categoryObj = categoryMap.get(cat.id);
      if (cat.parent_id === null) {
        rootCategories.push(categoryObj);
      } else {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.subcategories.push(categoryObj);
        }
      }
    });
    
    res.json(rootCategories);
  } catch (error) {
    console.error('Error fetching hierarchical categories:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchical categories' });
  }
});

module.exports = router;
