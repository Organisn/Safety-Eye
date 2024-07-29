# What if you want to anonymously real-time track your worksite PPE usage? 
_Strongly recommended GPU support execution. Install Python OpenCV with CUDA support in your virtual environment to have meaningful performance._
## Setup
### Git LFS (for developers)
From Git Bash:
```
git lfs install
git lfs track "HumanFallingDetectTracks/**"
git lfs track "StrongSORTYOLOv7/**"
```
Add tracked folders, commit and push
### Virtual environment
Install Anaconda  
From Anaconda Prompt:
```
cd C:\..\Safety-Eye # Go to working dir
conda update conda
conda update anaconda
conda create -n SafetyEye python=3.9
conda env list
conda activate SafetyEye
python --version
conda install pip
pip install --upgrade pip
conda install importlib_metadata
pip install Flask flask_assets simplejpeg
pip install -r StrongSORTYOLOv7/requirements.txt
pip install -e StrongSORTYOLOv7/strong_sort/deep/reid # Perform Microsoft Visual C++ build tools >=14.0 installation before
pip install -e StrongSORTYOLOv7
pip install -e StrongSORTYOLOv7/yolov7
pip install -e HumanFallingDetectTracks
pip install -e StrongSORTYOLOv7/InterferenceDetection
pip install -e .
```
Go to [/setup.py](/setup.py) and
1. comment line 2
2. uncomment line 3
3. then again `pip install -e .`
### VSCode
**Flask debugger**
1. From Code GUI go to "Run and Debug"
2. Select "Create a launch.json file"
3. Select "Flask configuration" and save
4. By debug configuration dropdown list select "Flask configuration"

**File watcher for large workspace**
1. Go to Preferences
2. Open Workspace Settings (JSON)
3. Search "files.watcherExclude" and edit JSON object excluding large folders and files

**Python interpreter**
1. Ctrl + Shift + P to open command palette
2. Open “Python: Select Interpreter”
3. Select setted up conda environment python interpreter
## Launch
### Flask app
Launch the app  from CMD or Powershell
`flask run`
To make server visible through its own network
`flask run --host=0.0.0.0`
Launch debug mode (server will automatically reload on changes)
`flask run --debug`
## User tips
+ Functional [video example](/StrongSORTYOLOv7/InterferenceDetection/DataSource/finalTrimmed2.mp4) to input the algorithm
