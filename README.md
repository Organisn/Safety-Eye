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
StrongSORTYOLOv7
StrongSORTYOLOv7/yolov7
HumanFallingDetectTracks
.
StrongSORTYOLOv7/InterferenceDetection
```
