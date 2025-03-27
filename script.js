 // Service Worker Registration
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful');
          }).catch(err => {
            console.log('ServiceWorker registration failed: ', err);
          });
        });
      }

      // App State Management
      const TodoApp = {
        state: {
          tasks: [],
          originalTasks: [],
          darkMode: localStorage.getItem('darkMode') === 'true' || 
                    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches),
          searchTerm: ''
        },
        
        // Initialize the app
        init() {
          this.loadTasks();
          this.setupEventListeners();
          this.setupTheme();
          this.updateTable();
        },
        
        // Load tasks from localStorage
        loadTasks() {
          try {
            const storedItems = localStorage.getItem('todos');
            if (storedItems) {
              this.state.tasks = JSON.parse(storedItems);
              this.state.originalTasks = [...this.state.tasks];
            }
          } catch (e) {
            console.error('Failed to load tasks:', e);
            this.showAlert('Failed to load tasks. Please refresh the page.', 'error');
          }
        },
        
        // Save tasks to localStorage
        saveTasks() {
          try {
            localStorage.setItem('todos', JSON.stringify(this.state.tasks));
            this.state.originalTasks = [...this.state.tasks];
          } catch (e) {
            console.error('Failed to save tasks:', e);
            this.showAlert('Failed to save tasks. Your changes may not persist.', 'error');
          }
        },
        
        // Set up all event listeners
        setupEventListeners() {
          // Form submission
          document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
          });
          
          // Search functionality
          document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.performSearch(document.getElementById('searchInput').value.trim());
          });
          
          document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            this.state.searchTerm = searchTerm;
            this.performSearch(searchTerm);
            document.getElementById('clearSearch').style.display = searchTerm ? 'block' : 'none';
          });
          
          document.getElementById('clearSearch').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('clearSearch').style.display = 'none';
            this.state.searchTerm = '';
            this.performSearch('');
          });
          
          // Clear all tasks
          document.getElementById('clear').addEventListener('click', () => {
            if (this.state.tasks.length === 0) {
              this.showAlert('There are no tasks to clear!', 'warning');
              return;
            }
            
            const clearModal = new bootstrap.Modal(document.getElementById('clearConfirmModal'));
            clearModal.show();
          });
          
          document.getElementById('confirmCheckbox').addEventListener('change', (e) => {
            document.getElementById('confirmClear').disabled = !e.target.checked;
          });
          
          document.getElementById('confirmClear').addEventListener('click', () => {
            this.clearAllTasks();
            const clearModal = bootstrap.Modal.getInstance(document.getElementById('clearConfirmModal'));
            clearModal.hide();
          });
          
          // Navigation
          document.getElementById('myTasksLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.focusOnTasks();
          });
          
          document.getElementById('homeLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHomeView();
          });
          
          // Theme toggle
          document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
          });
          
          // Print button
          document.getElementById('printBtn').addEventListener('click', () => {
            window.print();
          });
          
          // Error handling for offline state
          window.addEventListener('offline', () => {
            this.showAlert('You are offline. Some features may not work.', 'warning');
          });
          
          window.addEventListener('online', () => {
            this.showAlert('You are back online!', 'success');
          });
        },
        
        // Task management functions
        addTask() {
          const title = document.getElementById('title').value.trim();
          const description = document.getElementById('description').value.trim();
          
          if (!title) {
            this.showAlert('Task title cannot be empty!', 'error');
            document.getElementById('titleHelp').textContent = "Your task title is empty";
            document.getElementById('titleHelp').style.color = "var(--danger-color)";
            document.getElementById('title').focus();
            return;
          }
          
          const newTask = { 
            id: Date.now().toString(),
            title, 
            description,
            createdAt: new Date().toISOString(),
            completed: false
          };
          
          this.state.tasks.unshift(newTask);
          this.saveTasks();
          
          document.getElementById('title').value = '';
          document.getElementById('description').value = '';
          
          this.updateTable();
          this.showAlert('Task added successfully!', 'success');
          
          // If on My Tasks view, stay there
          if (document.getElementById('taskFormSection').style.display === 'none') {
            this.focusOnTasks();
          }
        },
        
        deleteTask(index) {
          const deletedTask = this.state.tasks[index];
          this.state.tasks.splice(index, 1);
          this.saveTasks();
          this.updateTable();
          this.showAlert(`Task "${deletedTask.title}" deleted`, 'success');
        },
        
        clearAllTasks() {
          this.state.tasks = [];
          this.state.originalTasks = [];
          this.saveTasks();
          this.updateTable();
          this.showAlert('All tasks have been cleared!', 'success');
          
          // Reset confirmation checkbox
          document.getElementById('confirmCheckbox').checked = false;
          document.getElementById('confirmClear').disabled = true;
        },
        
        // Search functionality
        performSearch(searchTerm) {
          if (searchTerm === '') {
            this.state.tasks = [...this.state.originalTasks];
          } else {
            this.state.tasks = this.state.originalTasks.filter(task => {
              return (
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.description.toLowerCase().includes(searchTerm.toLowerCase())
              );
            });
          }
          this.updateTable();
        },
        
        // UI Update functions
        updateTable() {
          const tablebody = document.getElementById('tablebody');
          
          if (this.state.tasks.length === 0) {
            if (this.state.searchTerm) {
              tablebody.innerHTML = `
                <tr>
                  <td colspan="4" class="text-center py-4">
                    <div class="text-muted">No tasks found matching "${this.state.searchTerm}"</div>
                  </td>
                </tr>
              `;
            } else {
              tablebody.innerHTML = `
                <tr>
                  <td colspan="4" class="text-center py-4 text-muted">No tasks found. Add a task to get started!</td>
                </tr>
              `;
            }
            return;
          }
          
          let html = '';
          this.state.tasks.forEach((task, index) => {
            const title = this.state.searchTerm ? 
              task.title.replace(new RegExp(`(${this.state.searchTerm})`, 'gi'), '<span class="highlight">$1</span>') : 
              task.title;
            const description = this.state.searchTerm ? 
              task.description.replace(new RegExp(`(${this.state.searchTerm})`, 'gi'), '<span class="highlight">$1</span>') : 
              task.description;
            
            html += `
              <tr class="task-item">
                <th scope="row">${index + 1}</th>
                <td>${title}</td>
                <td>${description || '<span class="text-muted">No description</span>'}</td>
                <td class="no-print">
                  <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${index}" aria-label="Delete task">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          });
          
          tablebody.innerHTML = html;
          
          // Add event listeners to delete buttons
          document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
              const index = parseInt(e.currentTarget.getAttribute('data-index'));
              this.deleteTask(index);
            });
          });
        },
        
        // Navigation functions
        focusOnTasks() {
          document.getElementById('items').scrollIntoView({ behavior: 'smooth' });
          document.getElementById('myTasksLink').classList.add('active');
          document.getElementById('homeLink').classList.remove('active');
          document.getElementById('taskFormSection').style.display = 'none';
        },
        
        showHomeView() {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          document.getElementById('homeLink').classList.add('active');
          document.getElementById('myTasksLink').classList.remove('active');
          document.getElementById('taskFormSection').style.display = 'block';
        },
        
        // Theme management
        setupTheme() {
          if (this.state.darkMode) {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
            document.getElementById('themeToggle').innerHTML = '<i class="bi bi-sun-fill"></i>';
          } else {
            document.documentElement.setAttribute('data-bs-theme', 'light');
            document.getElementById('themeToggle').innerHTML = '<i class="bi bi-moon-fill"></i>';
          }
        },
        
        toggleTheme() {
          this.state.darkMode = !this.state.darkMode;
          localStorage.setItem('darkMode', this.state.darkMode);
          this.setupTheme();
        },
        
        // Alert system
        showAlert(message, type = 'success', duration = 3000) {
          const alertContainer = document.getElementById('alertContainer');
          const alertId = 'alert-' + Date.now();
          
          const icons = {
            success: '<i class="bi bi-check-circle-fill me-2"></i>',
            error: '<i class="bi bi-exclamation-circle-fill me-2"></i>',
            warning: '<i class="bi bi-exclamation-triangle-fill me-2"></i>',
            info: '<i class="bi bi-info-circle-fill me-2"></i>'
          };
          
          const alertClasses = {
            success: 'alert-success',
            error: 'alert-danger',
            warning: 'alert-warning',
            info: 'alert-info'
          };
          
          const alertElement = document.createElement('div');
          alertElement.id = alertId;
          alertElement.className = `custom-alert alert ${alertClasses[type]} d-flex align-items-center`;
          alertElement.setAttribute('role', 'alert');
          alertElement.innerHTML = `
            ${icons[type]}
            <div>${message}</div>
          `;
          
          alertContainer.appendChild(alertElement);
          
          // Trigger reflow to enable animation
          void alertElement.offsetWidth;
          
          alertElement.classList.add('show');
          
          // Auto dismiss after duration
          setTimeout(() => {
            alertElement.classList.remove('show');
            setTimeout(() => {
              alertElement.remove();
            }, 300);
          }, duration);
        }
      };

      // Initialize the app when DOM is loaded
      document.addEventListener('DOMContentLoaded', () => {
        TodoApp.init();
      });