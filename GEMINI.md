# Project: logger

## Project Overview

This project is a simple, file-based logging utility written in Python. It provides a `Logger` class that can be used to log messages of different levels (INFO, WARN, ERROR) to specified files.

The main components are:
- `logger.py`: Contains the `Logger` class and a default logger instance.
- `main.py`: An example script demonstrating how to use the `Logger` class.
- `requirements.txt`: Lists project dependencies (currently none).

## Running the project

There is no build step for this project. To run the demonstration script, execute the following command:

```bash
python main.py
```

This will create `app.log` and `custom.log` with example log messages.

## Development Conventions

*   **Code Style:** Please adhere to a consistent coding style, preferably PEP 8 for Python.
*   **Testing:** All new features should be accompanied by unit or integration tests.
*   **Commits:** Follow conventional commit message standards.
*   **Branching:** Use feature branches for new development (e.g., `feat/add-new-feature`).
