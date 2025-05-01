# Bezier curve editor

This project contains implementation of a Bézier curve editor. This editor allows
users to create, edit, manipulate, and manage Bézier curves through various interactive modes like drawing, editing,
selecting, rotating, and resizing. Each mode provides specific functionalities aimed at making the process of working
with Bézier curves intuitive and efficient.

It was created as an assignment for the course [Curve and Surface Design](https://dccg.upc.edu/courses-dcs/) at [FIB UPC](https://www.fib.upc.edu/es) during the Spring semester of 2024/2025.

## Modes
There are several modes in this editor.

### Draw
Allows to create new curves. Start by either clicking or dragging on an empty place in the canvas. 
Next point can be placed in the same fashion, either by clicking and creating a simple point or dragging and creating a bezier point.
When creating a point, by holding `LeftShift` you disconnect the magnitude of the two respective guides. 
By holding `LeftAlt` you can disconnect the guides entirely, both direction and magnitude.
Drawing is ended by pressing `Esc`.

### Edit
If a curve is selected, you can edit individual points of the curve. 
By selecting a point the available point guides are highlighted.
Again, by holding `LeftShift` or `LeftAlt` you can alter the guides' behaviour.
If a simple point without guides is selected, by holding `LeftAlt` and dragging on the point you create new guides.
By pressing `Backspace` you can delete currently selected point.
Double-clicking on a part of the curve creates a new point at the selected location. 
Editing mode is ended by pressing `Esc`.

### Select
This mode allows to first select and then move any curve around the canvas.
Either by dragging the corners or the curve itself.
By pressing `Backspace` you can delete currently selected curve.

### Rotate
When selected allows to rotate the currently selected curve by dragging one of the corners.
By pressing `Backspace` you can delete currently selected curve.

### Resize
When selected allows to resize the currently selected curve by dragging one of the corners or one of the edges.
By pressing `Backspace` you can delete currently selected curve.