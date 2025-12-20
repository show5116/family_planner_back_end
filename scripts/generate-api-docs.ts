import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { execSync } from 'child_process';

interface DtoField {
  name: string;
  type: string;
  description?: string;
  example?: any;
  required: boolean;
  isArray?: boolean;
}

interface DtoInfo {
  name: string;
  fields: DtoField[];
}

interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
  description?: string;
  guards?: string[];
  requestBody?: DtoInfo;
  responses?: Array<{
    status: number;
    description: string;
    schema?: DtoInfo;
  }>;
  pathParameters?: DtoField[];
  queryParameters?: DtoField[];
}

interface ControllerInfo {
  name: string;
  tag: string;
  basePath: string;
  endpoints: ApiEndpoint[];
}

class ApiDocGenerator {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private srcDir: string;
  private dtoCache: Map<string, DtoInfo> = new Map();

  constructor(srcDir: string) {
    this.srcDir = srcDir;
    const configPath = ts.findConfigFile(
      srcDir,
      ts.sys.fileExists,
      'tsconfig.json',
    );
    const configFile = ts.readConfigFile(configPath!, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath!),
    );

    this.program = ts.createProgram(
      compilerOptions.fileNames,
      compilerOptions.options,
    );
    this.checker = this.program.getTypeChecker();
  }

  private extractDecoratorValue(
    decorator: ts.Decorator,
    propertyName?: string,
  ): any {
    const expression = decorator.expression as ts.CallExpression;
    if (!expression.arguments || expression.arguments.length === 0) {
      return undefined;
    }

    const arg = expression.arguments[0];

    if (propertyName && ts.isObjectLiteralExpression(arg)) {
      const property = arg.properties.find(
        (prop) =>
          ts.isPropertyAssignment(prop) &&
          ts.isIdentifier(prop.name) &&
          prop.name.text === propertyName,
      );
      if (property && ts.isPropertyAssignment(property)) {
        return this.extractLiteralValue(property.initializer);
      }
      return undefined;
    }

    return this.extractLiteralValue(arg);
  }

  private extractLiteralValue(node: ts.Node): any {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }
    if (ts.isNumericLiteral(node)) {
      return parseInt(node.text, 10);
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    }
    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    }
    if (ts.isObjectLiteralExpression(node)) {
      const obj: Record<string, any> = {};
      node.properties.forEach((prop) => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          obj[prop.name.text] = this.extractLiteralValue(prop.initializer);
        }
      });
      return obj;
    }
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map((el) => this.extractLiteralValue(el));
    }
    if (ts.isIdentifier(node)) {
      return node.text;
    }
    return undefined;
  }

  private getDecoratorName(decorator: ts.Decorator): string {
    const expression = decorator.expression;
    if (ts.isCallExpression(expression)) {
      if (ts.isIdentifier(expression.expression)) {
        return expression.expression.text;
      }
    }
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }
    return '';
  }

  private extractGuards(method: ts.MethodDeclaration): string[] {
    const guards: string[] = [];
    if (!method.modifiers) return guards;

    method.modifiers.forEach((modifier) => {
      if (ts.isDecorator(modifier)) {
        const decoratorName = this.getDecoratorName(modifier);
        if (decoratorName === 'UseGuards') {
          const expression = modifier.expression as ts.CallExpression;
          expression.arguments.forEach((arg) => {
            if (ts.isIdentifier(arg)) {
              guards.push(arg.text);
            }
          });
        }
        if (decoratorName === 'RequirePermission') {
          const value = this.extractDecoratorValue(modifier);
          if (value) {
            guards.push(`RequirePermission(${value})`);
          }
        }
      }
    });

    return guards;
  }

  private parseDtoFile(dtoName: string): DtoInfo | null {
    // 캐시 확인
    if (this.dtoCache.has(dtoName)) {
      return this.dtoCache.get(dtoName)!;
    }

    // DTO 파일 찾기
    const dtoFiles = this.findDtoFiles(this.srcDir);
    const dtoFile = dtoFiles.find((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      return content.includes(`class ${dtoName}`);
    });

    if (!dtoFile) {
      return null;
    }

    const sourceFile = this.program.getSourceFile(dtoFile);
    if (!sourceFile) {
      return null;
    }

    let dtoInfo: DtoInfo | null = null;

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name?.text === dtoName) {
        const fields: DtoField[] = [];

        node.members.forEach((member) => {
          if (
            ts.isPropertyDeclaration(member) &&
            ts.isIdentifier(member.name)
          ) {
            const fieldName = member.name.text;
            let fieldType = 'any';
            let description = '';
            let example: any = undefined;
            let isArray = false;
            const required = !member.questionToken;

            // 타입 추출
            if (member.type) {
              fieldType = member.type.getText().replace(/\s+/g, ' ');
              if (ts.isArrayTypeNode(member.type)) {
                isArray = true;
                fieldType = member.type.elementType
                  .getText()
                  .replace(/\s+/g, ' ');
              }
            }

            // ApiProperty 데코레이터 정보 추출
            if (member.modifiers) {
              member.modifiers.forEach((modifier) => {
                if (ts.isDecorator(modifier)) {
                  const decoratorName = this.getDecoratorName(modifier);
                  if (
                    decoratorName === 'ApiProperty' ||
                    decoratorName === 'ApiPropertyOptional'
                  ) {
                    description =
                      this.extractDecoratorValue(modifier, 'description') || '';
                    example = this.extractDecoratorValue(modifier, 'example');
                    const isArrayProp = this.extractDecoratorValue(
                      modifier,
                      'isArray',
                    );
                    if (isArrayProp) {
                      isArray = true;
                    }

                    // type 속성으로 중첩 DTO 참조 확인
                    const typeValue = this.extractDecoratorValue(
                      modifier,
                      'type',
                    );
                    if (typeValue && !example) {
                      // 중첩된 DTO는 간단히 타입 이름만 표시
                      example = `<${typeValue}>`;
                    }
                  }
                }
              });
            }

            fields.push({
              name: fieldName,
              type: fieldType,
              description,
              example,
              required,
              isArray,
            });
          }
        });

        dtoInfo = { name: dtoName, fields };
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    if (dtoInfo) {
      this.dtoCache.set(dtoName, dtoInfo);
    }

    return dtoInfo;
  }

  private findDtoFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        files.push(...this.findDtoFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.dto.ts')) {
        files.push(fullPath);
      }
    });

    return files;
  }

  private extractParameters(method: ts.MethodDeclaration): {
    body?: string;
    path: DtoField[];
    query: DtoField[];
  } {
    let bodyDtoName: string | undefined;
    const pathParams: DtoField[] = [];
    const queryParams: DtoField[] = [];

    method.parameters.forEach((param) => {
      if (!param.modifiers) return;

      param.modifiers.forEach((modifier) => {
        if (ts.isDecorator(modifier)) {
          const decoratorName = this.getDecoratorName(modifier);
          const paramName = ts.isIdentifier(param.name)
            ? param.name.text
            : 'unknown';
          const paramType = param.type ? param.type.getText() : 'any';

          if (decoratorName === 'Param') {
            const paramKey = this.extractDecoratorValue(modifier) || paramName;
            pathParams.push({
              name: paramKey,
              type: paramType,
              required: !param.questionToken,
            });
          } else if (decoratorName === 'Query') {
            const paramKey = this.extractDecoratorValue(modifier) || paramName;
            queryParams.push({
              name: paramKey,
              type: paramType,
              required: !param.questionToken,
            });
          } else if (decoratorName === 'Body') {
            bodyDtoName = paramType;
          }
        }
      });
    });

    return { body: bodyDtoName, path: pathParams, query: queryParams };
  }

  private extractEndpoints(
    classDecl: ts.ClassDeclaration,
    basePath: string,
  ): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];

    classDecl.members.forEach((member) => {
      if (ts.isMethodDeclaration(member) && member.modifiers) {
        let method = '';
        let methodPath = '';
        let summary = '';
        let description = '';
        const responses: Array<{
          status: number;
          description: string;
          dtoName?: string;
        }> = [];

        member.modifiers.forEach((modifier) => {
          if (ts.isDecorator(modifier)) {
            const decoratorName = this.getDecoratorName(modifier);

            // HTTP 메서드 추출
            if (
              ['Get', 'Post', 'Patch', 'Put', 'Delete'].includes(decoratorName)
            ) {
              method = decoratorName.toUpperCase();
              const pathValue = this.extractDecoratorValue(modifier);
              methodPath = pathValue || '';
            }

            // ApiOperation 추출
            if (decoratorName === 'ApiOperation') {
              summary = this.extractDecoratorValue(modifier, 'summary') || '';
              description =
                this.extractDecoratorValue(modifier, 'description') || '';
            }

            // ApiResponse 추출
            if (
              [
                'ApiResponse',
                'ApiSuccess',
                'ApiCreated',
                'ApiNotFound',
                'ApiForbidden',
              ].includes(decoratorName)
            ) {
              const expression = modifier.expression as ts.CallExpression;
              let dtoName: string | undefined;
              let status: number;
              let desc: string | undefined;

              // 기본 status 설정
              status = this.getDefaultStatus(decoratorName);

              // 첫 번째 인자 처리
              if (expression.arguments && expression.arguments.length > 0) {
                const firstArg = expression.arguments[0];

                // 첫 번째 인자가 Identifier(클래스)인 경우 -> DTO
                if (ts.isIdentifier(firstArg)) {
                  dtoName = firstArg.text;
                  // 두 번째 인자가 설명
                  if (expression.arguments.length > 1) {
                    const secondArg = expression.arguments[1];
                    if (ts.isStringLiteral(secondArg)) {
                      desc = secondArg.text;
                    }
                  }
                }
                // 첫 번째 인자가 문자열인 경우 -> 설명만
                else if (ts.isStringLiteral(firstArg)) {
                  desc = firstArg.text;
                }
                // 첫 번째 인자가 객체인 경우 (ApiResponse 스타일)
                else if (ts.isObjectLiteralExpression(firstArg)) {
                  const statusValue = this.extractDecoratorValue(
                    modifier,
                    'status',
                  );
                  if (typeof statusValue === 'number') {
                    status = statusValue;
                  }
                  desc = this.extractDecoratorValue(modifier, 'description');
                  const typeValue = this.extractDecoratorValue(
                    modifier,
                    'type',
                  );
                  if (typeValue) {
                    dtoName = typeValue;
                  }
                }
              }

              if (dtoName || desc) {
                responses.push({
                  status,
                  description: desc || '',
                  dtoName,
                });
              }
            }
          }
        });

        if (method) {
          const fullPath = basePath + (methodPath ? `/${methodPath}` : '');
          const params = this.extractParameters(member);

          // Request Body DTO 파싱
          let requestBody: DtoInfo | undefined;
          if (params.body) {
            requestBody = this.parseDtoFile(params.body) || undefined;
          }

          // Response DTO 파싱 (2xx 성공 응답에 대해서만 스키마 파싱)
          const parsedResponses = responses.map((resp) => {
            let schema: DtoInfo | undefined;
            if (resp.dtoName && resp.status >= 200 && resp.status < 300) {
              schema = this.parseDtoFile(resp.dtoName) || undefined;
            }
            return {
              status: resp.status,
              description: resp.description,
              schema,
            };
          });

          endpoints.push({
            method,
            path: fullPath,
            summary,
            description,
            guards: this.extractGuards(member),
            requestBody,
            pathParameters: params.path.length > 0 ? params.path : undefined,
            queryParameters: params.query.length > 0 ? params.query : undefined,
            responses: parsedResponses.length > 0 ? parsedResponses : undefined,
          });
        }
      }
    });

    return endpoints;
  }

  private getDefaultStatus(decoratorName: string): number {
    const statusMap: Record<string, number> = {
      ApiSuccess: 200,
      ApiCreated: 201,
      ApiNotFound: 404,
      ApiForbidden: 403,
    };
    return statusMap[decoratorName] || 200;
  }

  private getDefaultDescription(decoratorName: string): string {
    const descMap: Record<string, string> = {
      ApiSuccess: '성공',
      ApiCreated: '생성 성공',
      ApiNotFound: '찾을 수 없음',
      ApiForbidden: '권한 없음',
    };
    return descMap[decoratorName] || '';
  }

  public parseController(filePath: string): ControllerInfo | null {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) return null;

    let controllerInfo: ControllerInfo | null = null;

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.modifiers) {
        let isController = false;
        let basePath = '';
        let tag = '';

        node.modifiers.forEach((modifier) => {
          if (ts.isDecorator(modifier)) {
            const decoratorName = this.getDecoratorName(modifier);

            if (decoratorName === 'Controller') {
              isController = true;
              basePath = this.extractDecoratorValue(modifier) || '';
            }

            if (decoratorName === 'ApiTags') {
              tag = this.extractDecoratorValue(modifier) || '';
            }
          }
        });

        if (isController && node.name) {
          const endpoints = this.extractEndpoints(node, basePath);
          controllerInfo = {
            name: node.name.text,
            tag: tag || basePath,
            basePath,
            endpoints,
          };
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return controllerInfo;
  }

  private formatDtoSchema(
    dto: DtoInfo,
    indent: string = '',
    maxDepth: number = 2,
    currentDepth: number = 0,
  ): string {
    // 빈 DTO인 경우 간단하게 표시
    if (dto.fields.length === 0) {
      return '```json\n{}\n```';
    }

    let schema = '```json\n{\n';
    dto.fields.forEach((field, index) => {
      const comma = index < dto.fields.length - 1 ? ',' : '';
      let value: string;
      let nestedDto: DtoInfo | null = null;

      // 중첩 DTO 확인 (example이 <DtoName> 형태인 경우)
      if (
        typeof field.example === 'string' &&
        field.example.startsWith('<') &&
        field.example.endsWith('>') &&
        currentDepth < maxDepth
      ) {
        const nestedDtoName = field.example.slice(1, -1);
        nestedDto = this.parseDtoFile(nestedDtoName);
      }

      if (nestedDto && currentDepth < maxDepth) {
        // 중첩 DTO를 인라인으로 펼치기
        if (field.isArray) {
          value = '[\n    {\n';
          nestedDto.fields.forEach((nestedField, nestedIndex) => {
            const nestedComma =
              nestedIndex < nestedDto.fields.length - 1 ? ',' : '';
            const nestedValue = this.getNestedFieldValue(
              nestedField,
              currentDepth + 1,
              maxDepth,
            );
            const nestedTypeInfo = nestedField.isArray
              ? `${nestedField.type}[]`
              : nestedField.type;
            const nestedRequiredMark = nestedField.required ? '' : '?';
            const nestedComment = nestedField.description
              ? ` // ${nestedField.description} (${nestedTypeInfo}${nestedRequiredMark})`
              : ` // ${nestedTypeInfo}${nestedRequiredMark}`;
            value += `      "${nestedField.name}": ${nestedValue}${nestedComma}${nestedComment}\n`;
          });
          value += '    }\n  ]';
        } else {
          value = '{\n';
          nestedDto.fields.forEach((nestedField, nestedIndex) => {
            const nestedComma =
              nestedIndex < nestedDto.fields.length - 1 ? ',' : '';
            const nestedValue = this.getNestedFieldValue(
              nestedField,
              currentDepth + 1,
              maxDepth,
            );
            const nestedTypeInfo = nestedField.isArray
              ? `${nestedField.type}[]`
              : nestedField.type;
            const nestedRequiredMark = nestedField.required ? '' : '?';
            const nestedComment = nestedField.description
              ? ` // ${nestedField.description} (${nestedTypeInfo}${nestedRequiredMark})`
              : ` // ${nestedTypeInfo}${nestedRequiredMark}`;
            value += `    "${nestedField.name}": ${nestedValue}${nestedComma}${nestedComment}\n`;
          });
          value += '  }';
        }
      } else if (field.example !== undefined) {
        if (typeof field.example === 'string') {
          // <DtoName> 형태는 그대로 표시
          if (field.example.startsWith('<') && field.example.endsWith('>')) {
            value = `"${field.example}"`;
          } else {
            value = `"${field.example}"`;
          }
        } else if (Array.isArray(field.example)) {
          value = JSON.stringify(field.example);
        } else if (typeof field.example === 'object') {
          // 객체 타입은 한 줄로 컴팩트하게 표시
          value = JSON.stringify(field.example);
        } else {
          value = String(field.example);
        }
      } else {
        value = this.getFieldDefaultValue(field);
      }

      const typeInfo = field.isArray ? `${field.type}[]` : field.type;
      const requiredMark = field.required ? '' : '?';
      const comment = field.description
        ? ` // ${field.description} (${typeInfo}${requiredMark})`
        : ` // ${typeInfo}${requiredMark}`;

      schema += `  "${field.name}": ${value}${comma}${comment}\n`;
    });
    schema += '}\n```';
    return schema;
  }

  private getNestedFieldValue(
    field: DtoField,
    currentDepth: number,
    maxDepth: number,
  ): string {
    // 중첩 DTO 확인
    if (
      typeof field.example === 'string' &&
      field.example.startsWith('<') &&
      field.example.endsWith('>') &&
      currentDepth < maxDepth
    ) {
      const nestedDtoName = field.example.slice(1, -1);
      const nestedDto = this.parseDtoFile(nestedDtoName);

      if (nestedDto) {
        // 중첩 DTO를 객체로 펼치기
        let obj = '{\n';
        nestedDto.fields.forEach((nField, nIndex) => {
          const comma = nIndex < nestedDto.fields.length - 1 ? ',' : '';
          const nValue = this.getFieldDefaultValue(nField);
          obj += `        "${nField.name}": ${nValue}${comma}\n`;
        });
        obj += '      }';
        return obj;
      }
    }

    return this.getFieldDefaultValue(field);
  }

  private getFieldDefaultValue(field: DtoField): string {
    if (field.example !== undefined) {
      if (typeof field.example === 'string') {
        // <DtoName> 형태는 그대로 표시
        if (field.example.startsWith('<') && field.example.endsWith('>')) {
          return `"${field.example}"`;
        }
        return `"${field.example}"`;
      } else if (Array.isArray(field.example)) {
        return JSON.stringify(field.example);
      } else if (typeof field.example === 'object') {
        return JSON.stringify(field.example);
      } else {
        return String(field.example);
      }
    }

    // example이 없을 때 타입에 따라 기본값 설정
    if (field.isArray) {
      return '[]';
    } else if (field.type === 'string') {
      return '""';
    } else if (field.type === 'number') {
      return '0';
    } else if (field.type === 'boolean') {
      return 'false';
    } else if (field.type.includes('Date')) {
      return '"2025-01-01T00:00:00Z"';
    } else {
      return 'null';
    }
  }

  public generateMarkdown(controllers: ControllerInfo[]): string {
    let markdown = `# API Documentation\n\n`;
    markdown += `> 자동 생성된 API 문서입니다. UI 개발 시 참고하세요.\n\n`;
    markdown += `---\n\n`;

    controllers.forEach((controller) => {
      markdown += `## ${controller.tag}\n\n`;
      markdown += `**Base Path:** \`/${controller.basePath}\`\n\n`;

      controller.endpoints.forEach((endpoint) => {
        markdown += `### ${endpoint.method} \`${endpoint.path}\`\n\n`;

        if (endpoint.summary) {
          markdown += `**요약:** ${endpoint.summary}\n\n`;
        }

        if (endpoint.description) {
          markdown += `**설명:**\n${endpoint.description}\n\n`;
        }

        if (endpoint.guards && endpoint.guards.length > 0) {
          markdown += `**인증/권한:**\n\n`;
          endpoint.guards.forEach((guard) => {
            markdown += `- ${guard}\n`;
          });
          markdown += `\n`;
        }

        // Path Parameters
        if (endpoint.pathParameters && endpoint.pathParameters.length > 0) {
          markdown += `**Path Parameters:**\n\n`;
          endpoint.pathParameters.forEach((param) => {
            markdown += `- \`${param.name}\` (\`${param.type}\`)`;
            if (!param.required) {
              markdown += ` - Optional`;
            }
            if (param.description) {
              markdown += `: ${param.description}`;
            }
            markdown += `\n`;
          });
          markdown += `\n`;
        }

        // Query Parameters
        if (endpoint.queryParameters && endpoint.queryParameters.length > 0) {
          markdown += `**Query Parameters:**\n\n`;
          endpoint.queryParameters.forEach((param) => {
            markdown += `- \`${param.name}\` (\`${param.type}\`)`;
            if (!param.required) {
              markdown += ` - Optional`;
            }
            if (param.description) {
              markdown += `: ${param.description}`;
            }
            markdown += `\n`;
          });
          markdown += `\n`;
        }

        // Request Body
        if (endpoint.requestBody) {
          markdown += `**Request Body:**\n\n`;
          markdown += this.formatDtoSchema(endpoint.requestBody);
          markdown += `\n\n`;
        }

        // Responses
        if (endpoint.responses && endpoint.responses.length > 0) {
          markdown += `**Responses:**\n\n`;
          endpoint.responses.forEach((response) => {
            markdown += `#### ${response.status} - ${response.description}\n\n`;
            if (response.schema) {
              markdown += this.formatDtoSchema(response.schema);
              markdown += `\n\n`;
            }
          });
        }

        markdown += `---\n`;
      });
      markdown += `\n`;
    });

    // 마지막 빈 줄 제거
    return markdown.trimEnd() + '\n';
  }
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const outputDir = path.join(__dirname, '..', 'docs', 'api');

  // docs/api 디렉토리 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const generator = new ApiDocGenerator(srcDir);

  // 모든 controller 파일 찾기
  const findControllers = (dir: string): string[] => {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        files.push(...findControllers(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
        files.push(fullPath);
      }
    });

    return files;
  };

  const controllerFiles = findControllers(srcDir);
  const controllers: ControllerInfo[] = [];

  controllerFiles.forEach((filePath) => {
    console.log(`Parsing: ${path.relative(srcDir, filePath)}`);
    const controllerInfo = generator.parseController(filePath);
    if (controllerInfo) {
      controllers.push(controllerInfo);

      // 개별 controller별 문서 생성
      const markdown = generator.generateMarkdown([controllerInfo]);
      const outputFile = path.join(
        outputDir,
        `${controllerInfo.basePath || 'root'}.md`,
      );
      fs.writeFileSync(outputFile, markdown);
      console.log(`Generated: ${path.relative(process.cwd(), outputFile)}`);
    }
  });

  // 전체 API 문서 생성
  if (controllers.length > 0) {
    const allMarkdown = generator.generateMarkdown(controllers);
    const allOutputFile = path.join(outputDir, 'all-apis.md');
    fs.writeFileSync(allOutputFile, allMarkdown);
    console.log(
      `\nGenerated complete API documentation: ${path.relative(process.cwd(), allOutputFile)}`,
    );
  }

  console.log(`\nTotal controllers processed: ${controllers.length}`);

  // Prettier 실행
  console.log(`\nRunning Prettier on generated markdown files...`);
  try {
    execSync(`npx prettier --write "${outputDir}/**/*.md"`, {
      stdio: 'inherit',
    });
    console.log('Prettier formatting completed successfully.');
  } catch (error) {
    console.error('Failed to run Prettier:', error);
  }
}

main();
