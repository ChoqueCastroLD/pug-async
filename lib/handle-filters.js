import { constantinople, dirname } from "../deps.js";
import walk from "../walk.js";
import error from "../error.js";

export default async function handleFilters(ast, filters, options, filterAliases) {
  options = options || {};
  await walk(
    ast,
    async function (node) {
      var dir = node.filename ? dirname(node.filename) : null;
      if (node.type === "Filter") {
        await handleNestedFilters(node, filters, options, filterAliases);
        var text = getBodyAsText(node);
        var attrs = getAttributes(node, options);
        attrs.filename = node.filename;
        node.type = "Text";
        node.val = filterWithFallback(node, text, attrs);
      } else if (node.type === "RawInclude" && node.filters.length) {
        var firstFilter = node.filters.pop();
        var attrs = getAttributes(firstFilter, options);
        var filename = (attrs.filename = node.file.fullPath);
        node.type = "Text";
        node.val = filterFileWithFallback(
          firstFilter,
          filename,
          node.file,
          attrs,
        );
        node.filters
          .slice()
          .reverse()
          .forEach(function (filter) {
            var attrs = getAttributes(filter, options);
            attrs.filename = filename;
            node.val = filterWithFallback(filter, node.val, attrs);
          });
        node.filters = undefined;
        node.file = undefined;
      }

      function filterWithFallback(filter, text, attrs, funcName) {
        var filterName = getFilterName(filter);

        if (filters && filters[filterName]) {
          return filters[filterName](text, attrs);
        }

        throw new Error(`Filter ${filterName} does not exist`);
      }

      function filterFileWithFallback(filter, filename, file, attrs) {
        var filterName = getFilterName(filter);
        if (filters && filters[filterName]) {
          if (filters[filterName].renderBuffer) {
            return filters[filterName].renderBuffer(file.raw, attrs);
          } else {
            return filters[filterName](file.str, attrs);
          }
        } else {
          return filterWithFallback(filter, filename, attrs, "renderFile");
        }
      }
    },
    { includeDependencies: true },
  );
  function getFilterName(filter) {
    var filterName = filter.name;
    if (filterAliases && filterAliases[filterName]) {
      filterName = filterAliases[filterName];
      if (filterAliases[filterName]) {
        throw error(
          "FILTER_ALISE_CHAIN",
          'The filter "' +
            filter.name +
            '" is an alias for "' +
            filterName +
            '", which is an alias for "' +
            filterAliases[filterName] +
            '".  Pug does not support chains of filter aliases.',
          filter,
        );
      }
    }
    return filterName;
  }
  return ast;
}

async function handleNestedFilters(node, filters, options, filterAliases) {
  if (node.block.nodes[0] && node.block.nodes[0].type === "Filter") {
    node.block.nodes[0] = await handleFilters(
      node.block,
      filters,
      options,
      filterAliases,
    ).nodes[0];
  }
}

function getBodyAsText(node) {
  return node.block.nodes
    .map(function (node) {
      return node.val;
    })
    .join("");
}

function getAttributes(node, options) {
  var attrs = {};
  node.attrs.forEach(function (attr) {
    try {
      attrs[attr.name] = attr.val === true
        ? true
        : constantinople.toConstant(attr.val);
    } catch (ex) {
      if (/not constant/.test(ex.message)) {
        throw error(
          "FILTER_OPTION_NOT_CONSTANT",
          ex.message +
            " All filters are rendered compile-time so filter options must be constants.",
          node,
        );
      }
      throw ex;
    }
  });
  var opts = options[node.name] || {};
  Object.keys(opts).forEach(function (opt) {
    if (!attrs.hasOwnProperty(opt)) {
      attrs[opt] = opts[opt];
    }
  });
  return attrs;
}
