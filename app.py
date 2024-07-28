from os import listdir, makedirs, remove
from os.path import join, isdir, splitext
from flask import Flask, Response, flash, request, render_template, send_from_directory, redirect
from werkzeug.utils import secure_filename
from StrongSORTYOLOv7.track_v7 import trackv7
from cv2 import VideoCapture, imwrite
from json import loads, dumps
from shutil import rmtree
from HumanFallingDetectTracks.main import posev3

# Config constants
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'mp4'}

app = Flask(__name__)
app.secret_key = "secret key"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Create upload folder if not existing
makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
# app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

'''
@app.route("/")
def hello_world():
    return "<p>Welcome!</p><a href=\"/login\">Login page</a>"

@app.route("/<name>")
def hello(name):
    return f"<p>Hello, {name}!</p>"
'''
'''
@app.route("/")
@app.route("/<name>")
def hello(name='World'):
    return f"<p>Hello, {name}!</p>"
'''
'''
@app.route('/')
@app.route('/<name>')
def hello(name=None):
    return render_template('hello.html', name=name)
'''
'''
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        return logged()
    else:
        return form()

def logged():
    return "Logged in!"

def form():
    return render_template('login.html')
'''

@app.get('/')
def show_upload_page():
    # Upload page
    return render_template('upload.html')

def allowed_file(filename):
    # Many filenames can contain multiple '.' characters
    # We look for the part after the last of them
    if '.' in filename:
        last_extension = filename.rsplit('.', 1)[1].lower()
        return last_extension in ALLOWED_EXTENSIONS
    else: return False
    # return '.' in filename and \
    #        last_extension in ALLOWED_EXTENSIONS

@app.route('/uploads', methods=['GET', 'POST'])
def get_uploads():
    if request.method == 'GET': # user is trying to consult the entire uploads register
        # A list of directory paths (one for each uploaded video) will be sent to template
        upload_folders = []
        for path in listdir(app.config['UPLOAD_FOLDER']):
            absolute_path = join(app.config['UPLOAD_FOLDER'], path)
            if isdir(absolute_path): upload_folders.append(path)
        return render_template('uploads.html', uploads=upload_folders)
    else: # is trying to upload a file
        if 'file' not in request.files:
            flash('No file part')
            # Upload page
            return render_template('upload.html')
        file = request.files['file']
        # If the user does not select a file, the browser submits an
        # empty file without a filename.
        if file.filename == '':
            flash('No selected file')
            # Upload page
            return render_template('upload.html')
        # Only videos can be uploaded
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filename_without_ext = splitext(filename)[0]
            file_folder = join(app.config['UPLOAD_FOLDER'], filename_without_ext)
            # Check if already uploaded and eventually do it
            try:
                makedirs(file_folder)
                file_path = join(file_folder, filename)
                file.save(file_path)
            except:
                # (A popup to choose if alter filename or overwrite existing file could help)
                flash('File with same name already uploaded: delete existing file or change its filename or the name of the file you\'re trying to upload')
                # Upload page
                return render_template('upload.html')
            # Save first frame of the uploaded file to shape areas during detection request configurations
            video_capture = VideoCapture(file_path)
            read, frame = video_capture.read()
            # Save image with video filename
            if read: imwrite(join(file_folder, f'{filename_without_ext}.jpg'), frame)
            video_capture.release()
            return redirect(f'/uploads/{filename_without_ext}')
        flash('Not allowed extension or not setted up file')
        # return render_template('login.html', method=request.method, username=request.form['username'], password=request.form['password'])
        return render_template('upload.html')

@app.get('/uploads/<folder>')
def get_upload(folder):
    # User trying to access specific resource and its detections
    folder = secure_filename(folder)
    folder_path = join(app.config['UPLOAD_FOLDER'], folder)
    detections = []
    file_path = None
    for path in listdir(folder_path):
        if splitext(path)[0] == folder: file_path = path
        else: detections.append(splitext(path)[0])
    return render_template('uploaded.html', file=file_path, folder=folder, detections=detections)

class DetectionRequest:
    def __init__(self, request):
        # Detection type (Interference and PPE/Pose)
        self.type = None
        # Data classes defined by dataset format
        self.classes = None
        # Rules in request are intended as permissions to walk through such area
        self.rules = None
        # Name assigned to file to which detection results are stored
        self.filename = ''
        # Filename + canvas_dimensions
        self.detection_infos = None
        # Canvas element from which areas in rules have been shaped
        self.canvas_dimensions = None
        # Parsing from URL
        # Request components maintain same disposition
        if isinstance(request, str):
            items = request.split('_')
            self.type = items[0]
            # Start compose filename...
            self.filename += self.type
            # Fill canvas dimensions if present
            i = 1
            if items[i][0] == '(':
                self.canvas_dimensions = eval(items[i]) # To secure prefer ast.literal_eval()
                i += 1
            # Fill classes and eventual rules
            self.classes = []
            while i < len(items):
                try:
                    self.classes.append(int(items[i]))
                    self.filename += f'_{items[i]}'
                except:
                    # Fill eventual rules
                    if self.rules == None:
                        self.rules = []
                    # Rules comes as stringed JSON objects
                    # Composed by an area as points array
                    # and a list of teams allowed to cross it as suits hex colours
                    # So, first, convert that string to dict
                    # RGB colours do not have to be converted in tuples
                    self.rules.append(loads(items[i]))
                    # In JSON format lists and tuples are both converted in js arrays ([])
                    self.filename += f'_{items[i]}'
                i += 1
        # From HTTP request
        # The only useful properties to fill in this case are the filename and detection informations to pass to template
        else:
            self.filename += request.form['detection']
            if self.filename == 'interference':
                if 'interferences' in request.form:
                    self.detection_infos = f'{self.filename}_{request.form["canvas-dimensions"]}'
                    # names: ['Shoes', 'Helmet', 'Person', 'Vest']
                    # Must maintain same order as declared in Data
                    if 'helmets' in request.form: 
                        self.filename += '_1'
                        self.detection_infos += '_1'
                    # When disabled, checkboxes results unchecked even if checked by js script
                    # Must manually add 'person' and 'vest' yolo classes
                    self.filename += '_2'
                    self.detection_infos += '_2'
                    self.filename += '_3'
                    self.detection_infos += '_3'
                    for rule in request.form.getlist('rule'):
                        # Parse rule
                        dict_rule = loads(rule)
                        teams = []
                        # Evaluate each rule team to tuple
                        # Convert to list
                        # Reverse to obtain BGR OpenCV format
                        for team in dict_rule['teams']:
                            listed_team = list(eval(team)) # To secure eventually prefer ast.literal_eval()
                            listed_team.reverse()
                            teams.append(listed_team)
                        dict_rule['teams'] = teams
                        # In JSON format lists and tuples are both converted in js arrays ([])
                        # So teams will be represented by square brackets even if parsed as tuples in dicts
                        # Redump dict
                        stringed_dict_rule = dumps(dict_rule)
                        self.filename += f'_{stringed_dict_rule}'
                        self.detection_infos += f'_{stringed_dict_rule}'
                else:
                    if 'helmets' in request.form:
                        self.filename += '_1'
                    if 'people' in request.form:
                        self.filename += '_2'
                    if 'suits' in request.form:
                        self.filename += '_3'
            else: # self.filename = 'pose'
                # class_names = ['Standing', 'Walking', 'Sitting', 'Lying Down', 'Stand up', 'Sit down', 'Fall Down']
                if 'upstanding' in request.form:
                    self.filename += '_0'
                if 'walking' in request.form:
                    self.filename += '_1'
                if 'sitting' in request.form:
                    self.filename += '_2'
                if 'lyingdown' in request.form:
                    self.filename += '_3'
                if 'standingup' in request.form:
                    self.filename += '_4'
                if 'sittingdown' in request.form:
                    self.filename += '_5'
                if 'fallendown' in request.form:
                    self.filename += '_6'

    #     # Now every info is available to get complete filename
    #     self.filename = self.get_detection_filename()

    # def get_detection_filename(self):
    #     filename = self.type
    #     for data_class in self.classes:
    #         filename += f'_{data_class}'
    #     for rule in self.rules:
    #         filename += f'_{dumps(rule)}'
    #     return filename

@app.post('/uploads/<folder>/detect')
def parse_detection(folder):
    # User trying to launch new detection
    # Handle request setting
    detection_request = DetectionRequest(request)
    folder = secure_filename(folder)
    folder_path = join(app.config["UPLOAD_FOLDER"], folder)
    for path in listdir(folder_path):
        filename_without_extension = splitext(path)[0]
        # If already saved show it with flashes
        if filename_without_extension == detection_request.filename:
            flash('Already stored')
            return render_template('detected.html', 
                                   file=path, 
                                   folder=folder, 
                                   detection=filename_without_extension)
    # If detection is not already carried out execute detection and stream it
    # Interferences detection request
    if detection_request.detection_infos != None:
        return render_template('detected.html', 
                           folder=folder, 
                           detection=detection_request.filename, 
                           detection_infos=detection_request.detection_infos)
    else: 
        return render_template('detected.html', 
                           folder=folder, 
                           detection=detection_request.filename)

@app.get('/uploads/<folder>/<detection>')
def get_detection(folder, detection):
    # User trying to access specific resource detection
    folder = secure_filename(folder)
    # Cannot secure while detection a stringed JSON
    # Securing causes severe alteration of the stored value
    # detection = secure_filename(detection)
    folder_path = join(app.config['UPLOAD_FOLDER'], folder)
    for path in listdir(folder_path):
        # Split text after the first dot from right to get filename without extension
        # If detection already saved show it
        if splitext(path)[0] == detection: 
            return render_template('detected.html', file=path, folder=folder, detection=detection)
    # Else return template with detection streaming
    # return render_template('detected.html', folder=folder, detection=detection)
            
@app.get('/uploads/<folder>/<detection>/detect')
def detect_source(folder, detection):
    # Detect resource and return iterable frame feed
    folder = secure_filename(folder)
    folder_path = join(app.config["UPLOAD_FOLDER"], folder)
    # detection = secure_filename(detection)
    detection_request = DetectionRequest(detection)
    for path in listdir(folder_path):
        # Since every source folder contains also source first frame
        # named as source file,
        # avoid picking images
        if not path.endswith('.jpg'):
            filename_without_extension = splitext(path)[0]
            if filename_without_extension == folder:
                if detection_request.type == 'interference':
                    # Interferences detection request
                    if detection_request.rules != None:
                        return Response(trackv7(source=join(folder_path, path), 
                                                project=folder_path, 
                                                classes=detection_request.classes, 
                                                rules=detection_request.rules, 
                                                filename=detection_request.filename, 
                                                shaper=detection_request.canvas_dimensions), 
                                                mimetype='multipart/x-mixed-replace; boundary=frame')
                    else:
                        return Response(trackv7(source=join(folder_path, path), 
                                                project=folder_path, 
                                                classes=detection_request.classes,  
                                                filename=detection_request.filename), 
                                                mimetype='multipart/x-mixed-replace; boundary=frame')
                else: 
                    return Response(posev3(source=join(folder_path, path), 
                                        project=folder_path, 
                                        classes=detection_request.classes, 
                                        filename=detection_request.filename), 
                                        mimetype='multipart/x-mixed-replace; boundary=frame')

@app.get('/uploads/<folder>/download')
def download_source(folder):
    folder = secure_filename(folder)
    folder_path = join(app.config["UPLOAD_FOLDER"], folder)
    for path in listdir(folder_path):
        filename_without_extension = splitext(path)[0]
        if filename_without_extension == folder:
            return send_from_directory(folder_path, path, as_attachment=True)

@app.get('/uploads/<folder>/delete')
def delete_source(folder):
    # Need to check if folder exists?
    # Normal user simply follows GUI paths...
    folder = secure_filename(folder)
    folder_path = join(app.config["UPLOAD_FOLDER"], folder)
    # Remove source directory and all its contents
    rmtree(folder_path)
    flash(f'{folder} has been removed')
    return redirect(f'/uploads')

@app.get('/uploads/<folder>/<detection>/download')
def download_detection(folder, detection):
    folder = secure_filename(folder)
    folder_path = join(app.config["UPLOAD_FOLDER"], folder)
    # detection = secure_filename(detection)
    for path in listdir(folder_path):
        filename_without_extension = splitext(path)[0]
        if filename_without_extension == detection: 
            return send_from_directory(folder_path, path, as_attachment=True)
        
@app.get('/uploads/<folder>/<detection>/delete')
def delete_detection(folder, detection):
    folder = secure_filename(folder)
    folder_path = join(app.config["UPLOAD_FOLDER"], folder)
    # detection = secure_filename(detection)
    for path in listdir(folder_path):
        filename_without_extension = splitext(path)[0]
        if filename_without_extension == detection:
            remove(join(folder_path, path))
            flash(f'{detection} has been removed')
            return redirect(f'/uploads/{folder}')