// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="action_NKApply1LightShaderToFolder" description="NK - Apply 1 light shader to folder">
        <property name="folderToApply" type="scenenode" default="" />
        <property name="light0Node" type="scenenode" default="" />
        <property name="ignoreFor" type="string" default="" />
        <property name="lightRadiusScale" type="float" default="1.0" />
    </action>
*/

// IgnoreFor format is
// nodeName1-materialIndexToIgnore1;nodeName2-materialIndexToIgnore2;
// it is possible to ignore multiple materials for the same node

var action_NKApply1LightShaderToFolder = function () { }

action_NKApply1LightShaderToFolder.prototype.execute = function (node) {
    var vertexShader =
        'uniform mat4 mWorldViewProj;' +
        'uniform mat4 mTransWorld;' +
        'uniform mat4 mWorld;' +
        'varying vec3 vNormal;' +
        'varying vec3 vWorldPos;' +
        'varying vec2 vUV;' +
        'void main()' +
        '{' +
        '    gl_Position = mWorldViewProj * gl_Vertex;' +
        '    vWorldPos = (mWorld * gl_Vertex).xyz;' +
        '    vNormal = normalize((mWorld * vec4(gl_Normal, 0.0)).xyz);' +
        '    gl_TexCoord[0] = gl_MultiTexCoord0;' +
        '    vUV = gl_MultiTexCoord0.xy;' +
        '    gl_FrontColor = gl_BackColor = vec4(1.0,1.0,1.0,1.0);' +
        '}';

    var fragmentShader =
        'varying vec3 vNormal;' +
        'varying vec3 vWorldPos;' +
        'varying vec2 vUV;' +
        'uniform sampler2D texture1;' +
        'uniform vec3 lightPos0;' +
        'uniform vec3 lightColor0;' +
        'uniform vec3 lightRadius0;' +
        'uniform vec3 uAmbientLight;' +
        'void main()' +
        '{' +
        '    vec3 N = normalize(vNormal);' +
        '    vec3 L = normalize(lightPos0 - vWorldPos);' +
        '    float dist = length(lightPos0 - vWorldPos);' +
        '    float attenuation = smoothstep(lightRadius0.x, 0.0, dist);' +
        '    vec4 texColor = texture2D(texture1, vUV);' +
        '    float height = texColor.a;' +
        '    float bump = mix(0.7, 1.0, height);' +
        '    float diff = max(dot(N, L), 0.0) * attenuation * bump;' +
        '    vec3 ambient = texColor.rgb * uAmbientLight;' +
        '    vec3 diffuse = texColor.rgb * diff * lightColor0;' +
        '    vec3 color = ambient + diffuse;' +
        '    gl_FragColor = vec4(color, texColor.a);' +
        '}';

    var rootNode = ccbGetRootSceneNode();
    var ambientLight = ccbGetSceneNodeProperty(rootNode, 'AmbientLight');

    var folderNodeChildCount = ccbGetSceneNodeChildCount(this.folderToApply);
    var light0Node = this.light0Node;
    var lightRadiusScale = this.lightRadiusScale;

    var shaderCallback = function () {
        var light0Color = ccbGetSceneNodeProperty(light0Node, 'Color');
        var lightPos0 = (ccbGetSceneNodeProperty(light0Node, 'PositionAbs'));
        var lightRadius0 = ccbGetSceneNodeProperty(light0Node, 'Radius');
        ccbSetShaderConstant(2, 'lightPos0', lightPos0.x, lightPos0.y, lightPos0.z, 0);
        ccbSetShaderConstant(2, 'lightColor0', light0Color.x, light0Color.y, light0Color.z, 0);
        ccbSetShaderConstant(2, 'lightRadius0', parseFloat(lightRadius0) * lightRadiusScale, 0, 0, 0);
        ccbSetShaderConstant(2, 'uAmbientLight', ambientLight.x, ambientLight.y, ambientLight.z, 0);
    };

    var newMaterial = ccbCreateMaterial(vertexShader, fragmentShader, 0, shaderCallback);

    // ignore list
    var ignoreList = {};
    if (this.ignoreFor) {
        var nodesAndMaterials = this.ignoreFor.split(';');
        for (var j = 0; j < nodesAndMaterials.length; j++) {
            var ignoreNodeAndIndex = nodesAndMaterials[j].split('-');
            var ignoreNode = ignoreNodeAndIndex[0];
            var ingnoreIndex = ignoreNodeAndIndex[1];
            if (!ignoreList[ignoreNode]) {
                var newIgnoreList = [ingnoreIndex];
                ignoreList[ignoreNode] = newIgnoreList;
            } else {
                ignoreList[ignoreNode].push(ingnoreIndex);
            }
        }
    }

    // add recursive, add ignore
    for (var i = 0; i < folderNodeChildCount; i++) {
        var childNode = ccbGetChildSceneNode(this.folderToApply, i);
        var childNodeName = ccbGetSceneNodeProperty(childNode, 'Name');
        var childNodeMaterialCount = ccbGetSceneNodeMaterialCount(childNode);
        for (var j = 0; j < childNodeMaterialCount; j++) {
            if (ignoreList[childNodeName] && ignoreList[childNodeName].indexOf(j.toString()) !== -1) {
                continue;
            }
            ccbSetSceneNodeMaterialProperty(childNode, j, 'Type', newMaterial);
        }
    }
}
