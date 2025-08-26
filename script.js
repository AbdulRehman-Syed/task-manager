class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.nextId = this.generateNextId();
        this.init();
    }

    init() {
        this.renderTasks();
        this.setupEventListeners();
        this.checkEmptyState();
    }

    loadTasks() {
        try {
            const storedTasks = localStorage.getItem('tasks');
            return storedTasks ? JSON.parse(storedTasks) : [];
        } catch (error) {
            console.error('Error loading tasks:', error);
            return [];
        }
    }

    generateNextId() {
        if (this.tasks.length === 0) return 1;
        return Math.max(...this.tasks.map(task => task.id)) + 1;
    }

    addTask(taskData) {
        const task = {
            id: this.nextId++,
            title: this.sanitizeInput(taskData.title),
            category: taskData.category,
            dueDate: taskData.dueDate || null,
            priority: taskData.priority,
            description: this.sanitizeInput(taskData.description) || '',
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.checkEmptyState();
        return task;
    }

    editTask(id, updatedData) {
        const taskIndex = this.tasks.findIndex(task => task.id === id);
        
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                ...updatedData,
                title: this.sanitizeInput(updatedData.title),
                description: this.sanitizeInput(updatedData.description) || ''
            };
            
            this.saveTasks();
            this.renderTasks();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.checkEmptyState();
    }

    toggleTaskCompletion(id) {
        const task = this.tasks.find(task => task.id === id);
        
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }

    renderTasks() {
        const taskList = document.getElementById('task-list');
        const filters = this.getFilters();
        const filteredTasks = this.filterAndSortTasks(filters);

        if (filteredTasks.length === 0) {
            taskList.innerHTML = '';
            return;
        }

        taskList.innerHTML = filteredTasks
            .map(task => this.createTaskElement(task))
            .join('');
            
        this.setupTaskEventListeners();
        this.setupDragAndDrop();
    }

    getFilters() {
        return {
            searchTerm: document.getElementById('search-input').value.toLowerCase(),
            category: document.getElementById('category-filter').value,
            priority: document.getElementById('priority-filter').value,
            status: document.getElementById('status-filter').value
        };
    }

    filterAndSortTasks(filters) {
        let filteredTasks = this.tasks.filter(task => {
            const matchesSearch = this.matchesSearch(task, filters.searchTerm);
            const matchesCategory = this.matchesCategory(task, filters.category);
            const matchesPriority = this.matchesPriority(task, filters.priority);
            const matchesStatus = this.matchesStatus(task, filters.status);
            
            return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
        });

        return filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            const priorityOrder = { High: 3, Medium: 2, Low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    matchesSearch(task, searchTerm) {
        if (!searchTerm) return true;
        return task.title.toLowerCase().includes(searchTerm) || 
               task.description.toLowerCase().includes(searchTerm);
    }

    matchesCategory(task, category) {
        return category === 'all' || task.category === category;
    }

    matchesPriority(task, priority) {
        return priority === 'all' || task.priority === priority;
    }

    matchesStatus(task, status) {
        if (status === 'all') return true;
        if (status === 'completed') return task.completed;
        if (status === 'pending') return !task.completed;
        return true;
    }

    createTaskElement(task) {
        const dueDate = task.dueDate 
            ? new Date(task.dueDate).toLocaleDateString() 
            : 'No due date';
            
        const isOverdue = this.isTaskOverdue(task);
        
        return `
            <div class="task-item ${task.completed ? 'task-completed' : ''}" 
                 data-id="${task.id}" 
                 draggable="true" 
                 role="listitem">
                <div class="task-checkbox">
                    <input type="checkbox" 
                           ${task.completed ? 'checked' : ''} 
                           aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}">
                </div>
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span class="task-category" aria-label="Category: ${task.category}">
                            ${task.category}
                        </span>
                        <span class="task-priority priority-${task.priority.toLowerCase()}" 
                              aria-label="Priority: ${task.priority}">
                            ${task.priority}
                        </span>
                        <span class="task-due-date" aria-label="Due date: ${dueDate}">
                            <i class="far fa-calendar-alt" aria-hidden="true"></i> ${dueDate}
                            ${isOverdue ? '<span class="overdue" aria-label="Overdue">OVERDUE</span>' : ''}
                        </span>
                    </div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="edit-btn" 
                            aria-label="Edit task: ${this.escapeHtml(task.title)}">
                        <i class="fas fa-edit" aria-hidden="true"></i>
                    </button>
                    <button class="delete-btn" 
                            aria-label="Delete task: ${this.escapeHtml(task.title)}">
                        <i class="fas fa-trash-alt" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        `;
    }

    isTaskOverdue(task) {
        if (!task.dueDate || task.completed) return false;
        return new Date(task.dueDate) < new Date();
    }

    escapeHtml(text) {
        if (!text) return '';
        
        const map = {
            '&': '&amp;',
            '<': '<',
            '>': '>',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    sanitizeInput(input) {
        if (!input) return '';
        return input.toString().trim();
    }

    checkEmptyState() {
        const emptyState = document.getElementById('empty-state');
        emptyState.style.display = this.tasks.length === 0 ? 'block' : 'none';
    }

    exportTasks() {
        try {
            const dataStr = JSON.stringify(this.tasks, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = 'tasks.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.classList.add('sr-only');
            
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
        } catch (error) {
            console.error('Error exporting tasks:', error);
            alert('Failed to export tasks. Please try again.');
        }
    }

    setupEventListeners() {
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', this.handleAddTask.bind(this));
        }
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
        }
        
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', this.handleFilterChange.bind(this));
        }
        
        const priorityFilter = document.getElementById('priority-filter');
        if (priorityFilter) {
            priorityFilter.addEventListener('change', this.handleFilterChange.bind(this));
        }
        
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', this.handleFilterChange.bind(this));
        }
        
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', this.handleExport.bind(this));
        }
        
        this.setupModalEvents();
    }

    handleAddTask(event) {
        event.preventDefault();
        
        const titleInput = document.getElementById('task-title');
        const categorySelect = document.getElementById('task-category');
        const dueDateInput = document.getElementById('task-due-date');
        const prioritySelect = document.getElementById('task-priority');
        const descriptionInput = document.getElementById('task-description');
        
        const title = titleInput ? titleInput.value : '';
        
        if (title && title.trim()) {
            const taskData = {
                title: title,
                category: categorySelect ? categorySelect.value : 'Personal',
                dueDate: dueDateInput ? dueDateInput.value : null,
                priority: prioritySelect ? prioritySelect.value : 'Medium',
                description: descriptionInput ? descriptionInput.value : ''
            };
            
            this.addTask(taskData);
            
            // Reset form
            if (titleInput) titleInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
        }
    }

    handleSearch() {
        this.renderTasks();
    }

    handleFilterChange() {
        this.renderTasks();
    }

    handleExport() {
        this.exportTasks();
    }

    setupModalEvents() {
        const modal = document.getElementById('edit-modal');
        const closeBtn = document.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        window.addEventListener('click', (event) => {
            if (modal && event.target === modal) {
                this.closeModal();
            }
        });
        
        document.addEventListener('keydown', (event) => {
            if (modal && event.key === 'Escape' && modal.style.display === 'block') {
                this.closeModal();
            }
        });
        
        const editForm = document.getElementById('edit-task-form');
        if (editForm) {
            editForm.addEventListener('submit', this.handleEditTask.bind(this));
        }
    }

    handleEditTask(event) {
        event.preventDefault();
        
        const idInput = document.getElementById('edit-task-id');
        const titleInput = document.getElementById('edit-task-title');
        const categorySelect = document.getElementById('edit-task-category');
        const dueDateInput = document.getElementById('edit-task-due-date');
        const prioritySelect = document.getElementById('edit-task-priority');
        const descriptionInput = document.getElementById('edit-task-description');
        
        const id = idInput ? parseInt(idInput.value) : null;
        
        if (id) {
            const updatedData = {
                title: titleInput ? titleInput.value : '',
                category: categorySelect ? categorySelect.value : 'Personal',
                dueDate: dueDateInput ? dueDateInput.value : null,
                priority: prioritySelect ? prioritySelect.value : 'Medium',
                description: descriptionInput ? descriptionInput.value : ''
            };
            
            this.editTask(id, updatedData);
            this.closeModal();
        }
    }

    closeModal() {
        const modal = document.getElementById('edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    setupTaskEventListeners() {
        document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                const taskId = parseInt(event.target.closest('.task-item').dataset.id);
                if (taskId) {
                    this.toggleTaskCompletion(taskId);
                }
            });
        });

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const taskId = parseInt(event.target.closest('.task-item').dataset.id);
                if (taskId) {
                    const task = this.tasks.find(t => t.id === taskId);
                    if (task) {
                        this.openEditModal(task);
                    }
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const taskId = parseInt(event.target.closest('.task-item').dataset.id);
                if (taskId) {
                    this.confirmDelete(taskId);
                }
            });
        });
    }

    confirmDelete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && confirm(`Are you sure you want to delete "${task.title}"?`)) {
            this.deleteTask(taskId);
        }
    }

    openEditModal(task) {
        const idField = document.getElementById('edit-task-id');
        const titleField = document.getElementById('edit-task-title');
        const categoryField = document.getElementById('edit-task-category');
        const dueDateField = document.getElementById('edit-task-due-date');
        const priorityField = document.getElementById('edit-task-priority');
        const descriptionField = document.getElementById('edit-task-description');
        const modal = document.getElementById('edit-modal');
        
        if (idField && titleField && categoryField && dueDateField && priorityField && descriptionField && modal) {
            idField.value = task.id;
            titleField.value = task.title || '';
            categoryField.value = task.category || 'Personal';
            dueDateField.value = task.dueDate || '';
            priorityField.value = task.priority || 'Medium';
            descriptionField.value = task.description || '';
            
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            
            titleField.focus();
        }
    }

    setupDragAndDrop() {
        const taskItems = document.querySelectorAll('.task-item');
        let draggedItem = null;

        taskItems.forEach(item => {
            item.addEventListener('dragstart', (event) => {
                draggedItem = item;
                setTimeout(() => item.classList.add('dragging'), 0);
            });

            item.addEventListener('dragend', () => {
                setTimeout(() => {
                    item.classList.remove('dragging');
                    draggedItem = null;
                }, 0);
            });
        });

        const taskList = document.getElementById('task-list');
        if (taskList) {
            taskList.addEventListener('dragover', (event) => {
                event.preventDefault();
                const afterElement = this.getDragAfterElement(taskList, event.clientY);
                const draggable = document.querySelector('.dragging');
                
                if (afterElement == null) {
                    taskList.appendChild(draggable);
                } else if (draggable) {
                    taskList.insertBefore(draggable, afterElement);
                }
            });

            taskList.addEventListener('drop', () => {
                this.updateTaskOrder();
            });
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updateTaskOrder() {
        const taskItems = document.querySelectorAll('.task-item');
        const newOrder = Array.from(taskItems)
            .map(item => parseInt(item.dataset.id))
            .filter(id => !isNaN(id));

        this.tasks.sort((a, b) => 
            newOrder.indexOf(a.id) - newOrder.indexOf(b.id)
        );

        this.saveTasks();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});